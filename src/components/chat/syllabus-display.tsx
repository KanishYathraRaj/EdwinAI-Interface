'use client';

import type { Syllabus } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SyllabusDisplayProps {
  syllabus: Syllabus;
}

export default function SyllabusDisplay({ syllabus }: SyllabusDisplayProps) {
  if (!syllabus) {
    return null;
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent className="p-0 pt-4 max-h-[60vh] overflow-y-auto">
        <Accordion type="multiple" defaultValue={syllabus.units.map((u, i) => `item-${i}`)}>
          {syllabus.units.map((unit, index) => (
            <AccordionItem value={`item-${index}`} key={unit.unit_number} className="border-b-0">
              <AccordionTrigger>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {unit.unit_number}
                  </span>
                  <span className="font-semibold">{unit.unit_title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pl-6 pr-4 py-2">
                  {unit.topics.map((topic) => (
                    <li key={topic} className="flex items-center gap-3">
                      <Checkbox id={topic} />
                      <Label htmlFor={topic} className="text-sm font-normal text-muted-foreground">
                        {topic}
                      </Label>
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
