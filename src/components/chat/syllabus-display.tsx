'use client';

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
import { useMemo } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyllabusDisplayProps {
  syllabus: Syllabus;
  chatId: string;
  completedSubtopics?: string[];
}

export default function SyllabusDisplay({ syllabus, chatId, completedSubtopics = [] }: SyllabusDisplayProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const totalSubtopics = useMemo(() => {
    let count = 0;
    syllabus.units.forEach(unit => {
      unit.topics?.forEach(topic => {
        if (topic.subtopics) {
          count += topic.subtopics.length;
        }
      });
    });
    return count;
  }, [syllabus]);

  const progress = totalSubtopics > 0 ? (completedSubtopics.length / totalSubtopics) * 100 : 0;

  const handleToggle = async (id: string, checked: boolean) => {
    if (!user || !chatId) return;
    const subjectRef = doc(firestore, `users/${user.uid}/subjects`, chatId);

    if (checked) {
      await updateDoc(subjectRef, {
        completed_subtopics: arrayUnion(id)
      });
    } else {
      await updateDoc(subjectRef, {
        completed_subtopics: arrayRemove(id)
      });
    }
  };

  if (!syllabus) {
    return null;
  }

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <div className="mb-6 px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Course Completion</span>
          <span className="text-sm font-bold">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <CardContent className="p-0 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
        <Accordion type="multiple" defaultValue={syllabus.units.map((u, i) => `unit-${i}`)}>
          {syllabus.units.map((unit, unitIndex) => (
            <AccordionItem value={`unit-${unitIndex}`} key={unit.unit_number || unitIndex} className="border-b border-border/20 mb-2 rounded-lg bg-muted/20 overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 text-left">
                  <span className="flex items-center justify-center size-8 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                    {unit.unit_number?.replace(/\D/g, '') || unitIndex + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      {unit.unit_number || `Unit ${unitIndex + 1}`}
                    </span>
                    <span className="font-semibold text-sm sm:text-base">{unit.unit_title}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pt-2 pb-4">
                <div className="space-y-4 pt-2">
                  {unit.topics?.map((topic, topicIndex) => {
                    // Normalization: handle different possible keys from LLM
                    const topicTitle = (topic as any).title || (topic as any).topic_title || `Topic ${topicIndex + 1}`;
                    const subtopics = topic.subtopics || (topic as any).sub_topics || [];

                    return (
                      <div key={topicIndex} className="pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-1.5 rounded-full bg-primary/60" />
                          <h4 className="text-sm font-bold text-foreground/90 uppercase tracking-tight">
                            {topicTitle}
                          </h4>
                        </div>

                        {subtopics.length > 0 ? (
                          <ul className="space-y-1 ml-3 border-l-2 border-border/20 pl-4">
                            {subtopics.map((subtopic, subIndex) => {
                              const id = `${unit.unit_number || unitIndex}|${topicTitle}|${subtopic}`;
                              const isCompleted = completedSubtopics.includes(id);

                              return (
                                <li key={subIndex} className="group flex items-center gap-3 py-1.5">
                                  <div className="relative flex items-center justify-center">
                                    <Checkbox
                                      id={id}
                                      checked={isCompleted}
                                      onCheckedChange={(checked) => handleToggle(id, !!checked)}
                                      className="size-4 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                                    />
                                  </div>
                                  <Label
                                    htmlFor={id}
                                    className={cn(
                                      "text-sm font-medium cursor-pointer transition-colors",
                                      isCompleted ? "text-muted-foreground line-through opacity-60" : "text-foreground/80 hover:text-foreground"
                                    )}
                                  >
                                    {subtopic}
                                  </Label>
                                  {isCompleted && <CheckCircle2 size={12} className="text-primary opacity-60" />}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground ml-7 italic">No subtopics available</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
