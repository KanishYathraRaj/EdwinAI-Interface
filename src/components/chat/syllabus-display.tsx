'use client';

import type { Syllabus } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SyllabusDisplayProps {
  syllabus: Syllabus;
}

export default function SyllabusDisplay({ syllabus }: SyllabusDisplayProps) {
  if (!syllabus) {
    return null;
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent className="p-0 pt-4">
        <Accordion type="single" collapsible defaultValue="item-0">
          {syllabus.units.map((unit, index) => (
            <AccordionItem value={`item-${index}`} key={unit.unit_number}>
              <AccordionTrigger>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {unit.unit_number}
                  </span>
                  <span className="font-semibold">{unit.unit_title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-10 pr-4 py-2">
                  {unit.topics.map((topic) => (
                    <li key={topic} className="text-sm text-muted-foreground">
                      {topic}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
