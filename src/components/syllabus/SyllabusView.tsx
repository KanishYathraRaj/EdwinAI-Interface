import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SyllabusItem } from '../../types';
import { supabase } from '../../lib/supabase';

interface SyllabusViewProps {
  subjectId: string;
}

interface SyllabusItemWithChildren extends SyllabusItem {
  children?: SyllabusItemWithChildren[];
}

export function SyllabusView({ subjectId }: SyllabusViewProps) {
  const [items, setItems] = useState<SyllabusItemWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSyllabusItems();
  }, [subjectId]);

  const loadSyllabusItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('syllabus_items')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      const itemsMap = new Map<string, SyllabusItemWithChildren>();
      (data || []).forEach((item) => {
        itemsMap.set(item.id, { ...item, children: [] });
      });

      const rootItems: SyllabusItemWithChildren[] = [];
      itemsMap.forEach((item) => {
        if (item.parent_id) {
          const parent = itemsMap.get(item.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(item);
          }
        } else {
          rootItems.push(item);
        }
      });

      setItems(rootItems);
    } catch (err) {
      console.error('Error loading syllabus items:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleComplete = async (itemId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('syllabus_items')
        .update({ is_completed: !isCompleted })
        .eq('id', itemId);

      if (error) throw error;

      const updateItemCompletion = (items: SyllabusItemWithChildren[]): SyllabusItemWithChildren[] => {
        return items.map((item) => {
          if (item.id === itemId) {
            return { ...item, is_completed: !isCompleted };
          }
          if (item.children) {
            return { ...item, children: updateItemCompletion(item.children) };
          }
          return item;
        });
      };

      setItems((prev) => updateItemCompletion(prev));
    } catch (err) {
      console.error('Error updating syllabus item:', err);
    }
  };

  const renderItem = (item: SyllabusItemWithChildren, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id} style={{ marginLeft: `${level * 24}px` }}>
        <div className="flex items-start gap-3 py-2 hover:bg-zinc-800/50 px-3 rounded-lg group">
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(item.id)}
              className="mt-1 text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4 mt-1" />
          )}
          <input
            type="checkbox"
            checked={item.is_completed}
            onChange={() => toggleComplete(item.id, item.is_completed)}
            className="mt-1.5 w-4 h-4 rounded border-gray-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading syllabus...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No syllabus items found. Upload a syllabus to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Syllabus</h2>
        <div className="bg-zinc-900 rounded-lg p-4">
          {items.map((item) => renderItem(item))}
        </div>
      </div>
    </div>
  );
}
