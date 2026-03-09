'use client';

import { useState, useMemo } from 'react';
import type { Syllabus, Subject } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { CheckCircle2, Pencil, Trash2, Plus, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rescheduleFromDate } from '@/lib/scheduling';
import { useToast } from '@/hooks/use-toast';

interface SyllabusDisplayProps {
  syllabus: Syllabus;
  subjectId: string;
  progressOwnerType?: 'subjects' | 'batches';
  progressOwnerId?: string;
  completedSubtopics?: string[];
  subject?: Subject; // Pass full subject for rescheduling
}

export default function SyllabusDisplay({
  syllabus,
  subjectId,
  progressOwnerType = 'subjects',
  progressOwnerId,
  completedSubtopics = [],
  subject
}: SyllabusDisplayProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editableSyllabus, setEditableSyllabus] = useState<Syllabus>(JSON.parse(JSON.stringify(syllabus)));
  const [isSaving, setIsSaving] = useState(false);
  const safeUnits = (syllabus as any)?.units || [];

  const totalSubtopics = useMemo(() => {
    let count = 0;
    safeUnits.forEach((unit: any) => {
      unit.topics?.forEach(topic => {
        const subtopics = topic.subtopics || (topic as any).sub_topics || [];
        count += subtopics.length;
      });
    });
    return count;
  }, [safeUnits]);

  const progress = totalSubtopics > 0 ? (completedSubtopics.length / totalSubtopics) * 100 : 0;

  const handleToggle = async (id: string, checked: boolean) => {
    if (!user || !progressOwnerId) return;
    const progressRef = doc(firestore, `users/${user.uid}/${progressOwnerType}`, progressOwnerId);

    if (checked) {
      await updateDoc(progressRef, {
        completed_subtopics: arrayUnion(id)
      });
    } else {
      await updateDoc(progressRef, {
        completed_subtopics: arrayRemove(id)
      });
    }
  };

  const handleSaveSyllabus = async () => {
    if (!user || !subjectId) return;
    setIsSaving(true);
    try {
      const subjectRef = doc(firestore, `users/${user.uid}/subjects`, subjectId);

      let updatePayload: any = {
        syllabus: editableSyllabus,
        updated_at: new Date().toISOString(),
      };

      // If we have scheduling data, offer to reschedule
      if (subject?.scheduledTopics && subject.availability && subject.startDate) {
        // Automatically reschedule from today or from the start
        const today = new Date().toISOString().split('T')[0];
        const newSchedule = rescheduleFromDate(
          { ...subject, syllabus: editableSyllabus } as any,
          editableSyllabus,
          today,
          []
        );
        updatePayload.scheduledTopics = newSchedule;
        toast({
          title: "Syllabus Updated",
          description: "Schedule has been automatically updated to reflect syllabus changes.",
        });
      } else {
        toast({
          title: "Syllabus Updated",
          description: "Changes saved successfully.",
        });
      }

      await updateDoc(subjectRef, updatePayload);
      setIsEditMode(false);
    } catch (error: any) {
      console.error("Error saving syllabus:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateUnitTitle = (index: number, title: string) => {
    const next = { ...editableSyllabus };
    next.units[index].unit_title = title;
    setEditableSyllabus(next);
  };

  const updateTopicTitle = (unitIndex: number, topicIndex: number, title: string) => {
    const next = { ...editableSyllabus };
    const topic = next.units[unitIndex].topics[topicIndex];
    (topic as any).title = title;
    (topic as any).topic_title = title;
    setEditableSyllabus(next);
  };

  const deleteTopic = (unitIndex: number, topicIndex: number) => {
    const next = { ...editableSyllabus };
    next.units[unitIndex].topics.splice(topicIndex, 1);
    setEditableSyllabus(next);
  };

  const addTopic = (unitIndex: number) => {
    const next = { ...editableSyllabus };
    next.units[unitIndex].topics.push({ title: 'New Topic', subtopics: [] } as any);
    setEditableSyllabus(next);
  };

  if (!syllabus) return null;

  const displaySyllabus: any = isEditMode ? editableSyllabus : syllabus;
  const displayUnits = displaySyllabus?.units || [];

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Course Completion</span>
            <span className="text-sm font-bold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditMode(false)} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveSyllabus} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setIsEditMode(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Syllabus
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-0 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
        <Accordion type="multiple" defaultValue={displayUnits.map((u: any, i: number) => `unit-${i}`)}>
          {displayUnits.map((unit: any, unitIndex: number) => (
            <AccordionItem value={`unit-${unitIndex}`} key={unit.unit_number || unitIndex} className="border-b border-border/20 mb-4 rounded-xl bg-muted/10 overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-4 py-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-4 text-left w-full">
                  <span className="flex items-center justify-center size-9 rounded-full bg-primary/20 text-primary text-sm font-bold shrink-0">
                    {unit.unit_number?.replace(/\D/g, '') || unitIndex + 1}
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      {unit.unit_number || `Unit ${unitIndex + 1}`}
                    </span>
                    {isEditMode ? (
                      <Input
                        value={unit.unit_title}
                        onChange={(e) => updateUnitTitle(unitIndex, e.target.value)}
                        className="h-8 font-semibold mt-1 bg-background"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base">{unit.unit_title}</span>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-4 pb-6">
                <div className="space-y-6">
                  {unit.topics?.map((topic, topicIndex) => {
                    const topicTitle = (topic as any).title || (topic as any).topic_title || `Topic ${topicIndex + 1}`;
                    const subtopics = topic.subtopics || (topic as any).sub_topics || [];

                    return (
                      <div key={topicIndex} className="relative pl-6 border-l-2 border-primary/20">
                        <div className="absolute left-[-6px] top-0 size-2.5 rounded-full bg-primary" />

                        <div className="flex items-center justify-between mb-3 group">
                          {isEditMode ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={topicTitle}
                                onChange={(e) => updateTopicTitle(unitIndex, topicIndex, e.target.value)}
                                className="h-7 text-xs font-bold uppercase tracking-tight bg-background border-none p-0 focus-visible:ring-0"
                              />
                            </div>
                          ) : (
                            <h4 className="text-xs font-bold text-foreground/90 uppercase tracking-tight">
                              {topicTitle}
                            </h4>
                          )}
                          {isEditMode && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTopic(unitIndex, topicIndex)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        {subtopics.length > 0 ? (
                          <div className="space-y-2">
                            {subtopics.map((subtopic, subIndex) => {
                              const id = `${unit.unit_number || unitIndex}|${topicTitle}|${subtopic}`;
                              const isCompleted = completedSubtopics.includes(id);

                              return (
                                <div key={subIndex} className="flex items-center gap-3 py-1 scale-in">
                                  {!isEditMode && (
                                    <Checkbox
                                      id={id}
                                      checked={isCompleted}
                                      onCheckedChange={(checked) => handleToggle(id, !!checked)}
                                      className="size-4"
                                    />
                                  )}
                                  <Label
                                    htmlFor={id}
                                    className={cn(
                                      "text-sm font-medium transition-colors",
                                      isCompleted ? "text-muted-foreground line-through opacity-60" : "text-foreground/80"
                                    )}
                                  >
                                    {subtopic}
                                  </Label>
                                  {isCompleted && !isEditMode && <CheckCircle2 size={12} className="text-primary opacity-60 ml-auto" />}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic ml-2">No subtopics available</p>
                        )}
                      </div>
                    );
                  })}
                  {isEditMode && (
                    <Button variant="outline" size="sm" className="w-full h-8 border-dashed" onClick={() => addTopic(unitIndex)}>
                      <Plus className="mr-2 h-4 w-4" /> Add Topic
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
