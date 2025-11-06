'use client';

import type { QuestionBank } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

interface QuestionBankDisplayProps {
  questionBank: QuestionBank;
}

export default function QuestionBankDisplay({ questionBank }: QuestionBankDisplayProps) {
  if (!questionBank) {
    return null;
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent className="p-0 pt-4 max-h-[75vh] overflow-y-auto">
        <Accordion type="multiple" defaultValue={questionBank.units.map((u) => `unit-${u.unit_number}`)}>
          {questionBank.units.map((unit) => (
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
                      {unit['2_marks'].map((question, i) => (
                        <li key={`2m-${i}`}>{question}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-md mb-3">16 Marks Questions</h4>
                    <ul className="list-decimal list-outside space-y-2 pl-5 text-muted-foreground">
                      {unit['16_marks'].map((question, i) => (
                        <li key={`16m-${i}`}>{question}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
