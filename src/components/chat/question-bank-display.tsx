'use client';

import type { QuestionBank } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

import { Share, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface QuestionBankDisplayProps {
  questionBank: QuestionBank;
  onPublish: (title: string, content: string, onSuccess?: () => void) => void;
  isPublishing?: boolean;
}

export default function QuestionBankDisplay({ questionBank, onPublish, isPublishing }: QuestionBankDisplayProps) {
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<'qb' | 'ak'>('qb');
  if (!questionBank) {
    return null;
  }

  const [publishedLocally, setPublishedLocally] = useState<boolean>(questionBank?.published_to_gcr || false);
  const [publishedAkLocally, setPublishedAkLocally] = useState<boolean>(questionBank?.answer_key_published_to_gcr || false);

  useEffect(() => {
    setPublishedLocally(questionBank?.published_to_gcr || false);
    setPublishedAkLocally(questionBank?.answer_key_published_to_gcr || false);
  }, [questionBank]);

  const handlePublish = (isAnswerKey: boolean = false) => {
    let content = isAnswerKey ? `# Answer Key: ${questionBank.course_title}\n\n` : `# Question Bank: ${questionBank.course_title}\n\n`;
    if (isAnswerKey) {
      if (questionBank.answer_key?.['2_marks']?.length) {
        content += `## 2 Marks Answers\n\n`;
        questionBank.answer_key['2_marks'].forEach((a, i) => {
          content += `**Question ${i + 1}**\n${a.answer}\n*Reference: ${a.references}*\n\n`;
        });
      }
      if (questionBank.answer_key?.['16_marks']?.length) {
        content += `## 16 Marks Answers\n\n`;
        questionBank.answer_key['16_marks'].forEach((a, i) => {
          content += `**Question ${i + 1}**\n${a.answer}\n*Reference: ${a.references}*\n\n`;
        });
      }
    } else {
      if (questionBank.questions?.['2_marks']?.length) {
        content += `## 2 Marks Questions\n`;
        questionBank.questions['2_marks'].forEach((q, i) => content += `${i + 1}. ${q}\n`);
        content += `\n`;
      }
      if (questionBank.questions?.['16_marks']?.length) {
        content += `## 16 Marks Questions\n`;
        questionBank.questions['16_marks'].forEach((q, i) => content += `${i + 1}. ${q}\n`);
        content += `\n`;
      }
    }
    const title = isAnswerKey ? `Answer Key - ${questionBank.course_title}` : `Question Bank - ${questionBank.course_title}`;
    onPublish(title, content, () => {
      if (isAnswerKey) {
        setPublishedAkLocally(true);
      } else {
        setPublishedLocally(true);
      }
    });
  };


  return (
    <Card className="w-full border-0 shadow-none">
      <div className="flex justify-end p-2 px-0 items-center gap-3">
        <Button
          onClick={() => {
            if (publishedLocally) {
              setPublishTarget('qb');
              setPublishConfirmOpen(true);
            } else {
              handlePublish(false);
            }
          }}
          disabled={isPublishing}
          size="sm"
          className={cn(
            "transition-all",
            publishedLocally && !isPublishing
              ? "bg-green-600/10 text-green-600 hover:bg-green-600/20 border border-green-600/20 dark:text-green-500 font-medium"
              : ""
          )}
          variant={publishedLocally ? "outline" : "outline"}
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : publishedLocally ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Published
            </>
          ) : (
            <>
              <Share className="mr-2 h-4 w-4" />
              Publish to Classroom
            </>
          )}
        </Button>
        <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Republish</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">This resource has already been published. Do you want to push it again?</p>
            <DialogFooter className="flex justify-end space-x-2">
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>
                  Cancel
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={() => { handlePublish(publishTarget === 'ak'); setPublishConfirmOpen(false); }}>
                  Republish
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <CardContent className="p-0 pt-2 pb-8">
        {/* Question Bank Section */}
        <div className="mb-8">
          <div className="bg-muted/30 p-4 border-b flex justify-between items-center rounded-t-lg">
            <h3 className="font-semibold text-lg">Questions</h3>
          </div>
          <div className="p-6 space-y-8">
            {questionBank.questions && (
              <>
                {questionBank.questions['2_marks']?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-md mb-3 text-muted-foreground">2 Marks Questions</h4>
                    <ul className="list-decimal list-outside space-y-3 pl-5">
                      {questionBank.questions['2_marks'].map((q, i) => (
                        <li key={`q-2m-${i}`} className="leading-relaxed">{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {questionBank.questions['16_marks']?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-md mb-3 text-muted-foreground mt-8">16 Marks Questions</h4>
                    <ul className="list-decimal list-outside space-y-3 pl-5">
                      {questionBank.questions['16_marks'].map((q, i) => (
                        <li key={`q-16m-${i}`} className="leading-relaxed">{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Compatibility for old unit-based structure */}
        {(!questionBank.questions && (questionBank as any).units) && (
          <Accordion type="multiple" defaultValue={(questionBank as any).units?.map((u: any) => `unit-${u.unit_number}`) || []}>
            {(questionBank as any).units?.map((unit: any) => (
              <AccordionItem value={`unit-${unit.unit_number}`} key={unit.unit_number} className="border-b-0 mb-4">
                <AccordionTrigger className="rounded-md bg-muted/50 px-4 hover:no-underline">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {unit.unit_number}
                    </span>
                    <span className="font-semibold">{unit.unit_title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="space-y-6 pl-6 pr-4">
                    <div>
                      <h4 className="font-semibold text-md mb-3">2 Marks Questions</h4>
                      <ul className="list-decimal list-outside space-y-2 pl-5 text-muted-foreground">
                        {unit['2_marks']?.map((question: any, i: number) => (
                          <li key={`2m-${i}`}>{question}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-md mb-3">16 Marks Questions</h4>
                      <ul className="list-decimal list-outside space-y-2 pl-5 text-muted-foreground">
                        {unit['16_marks']?.map((question: any, i: number) => (
                          <li key={`16m-${i}`}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Answer Key Section */}
        {questionBank.answer_key && (
          <div>
            <div className="bg-muted/30 p-4 border-y flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">Answer Key</h3>
              <Button
                onClick={() => {
                  if (publishedAkLocally) {
                    setPublishTarget('ak');
                    setPublishConfirmOpen(true);
                  } else {
                    handlePublish(true);
                  }
                }}
                disabled={isPublishing}
                size="sm"
                variant={publishedAkLocally ? "outline" : "outline"}
                className={cn(
                  "h-8 transition-all",
                  publishedAkLocally && !isPublishing
                    ? "bg-green-600/10 text-green-600 hover:bg-green-600/20 border border-green-600/20 dark:text-green-500 font-medium"
                    : ""
                )}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : publishedAkLocally ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Published
                  </>
                ) : (
                  <>
                    <Share className="mr-2 h-4 w-4" />
                    Publish Answer Key
                  </>
                )}
              </Button>
            </div>
            <div className="p-6 space-y-8 bg-muted/5 rounded-b-lg">
              {questionBank.answer_key['2_marks']?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-md mb-3 text-muted-foreground">2 Marks Answers</h4>
                  <div className="space-y-6">
                    {questionBank.answer_key['2_marks'].map((ans, i) => (
                      <div key={`a-2m-${i}`} className="space-y-2">
                        <div className="font-medium text-sm text-muted-foreground border-b pb-1">Question {i + 1}</div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{ans.answer}</p>
                        {ans.references && (
                          <p className="text-xs text-muted-foreground italic mt-2 opacity-80">Reference: {ans.references}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {questionBank.answer_key['16_marks']?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-md mb-3 text-muted-foreground mt-8">16 Marks Answers</h4>
                  <div className="space-y-6">
                    {questionBank.answer_key['16_marks'].map((ans, i) => (
                      <div key={`a-16m-${i}`} className="space-y-2">
                        <div className="font-medium text-sm text-muted-foreground border-b pb-1">Question {i + 1}</div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{ans.answer}</p>
                        {ans.references && (
                          <p className="text-xs text-muted-foreground italic mt-2 opacity-80">Reference: {ans.references}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
