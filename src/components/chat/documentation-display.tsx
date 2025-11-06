'use client';

import type { Documentation } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DocumentationDisplayProps {
  documentation: Documentation;
}

export default function DocumentationDisplay({ documentation }: DocumentationDisplayProps) {
  if (!documentation) {
    return null;
  }

  return (
    <div className="space-y-6">
        <div className='prose prose-invert max-w-none'>
            <h2>Overview</h2>
            <p className='text-muted-foreground'>{documentation.overview}</p>
        </div>

        <Accordion type="multiple" defaultValue={documentation.units.map(u => `unit-${u.unit_number}`)} className="w-full">
            {documentation.units.map((unit) => (
            <AccordionItem value={`unit-${unit.unit_number}`} key={unit.unit_number} className="mb-4 border-b-0 rounded-lg bg-card overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                        <span className="text-lg font-semibold text-primary">
                        {unit.unit_number}
                        </span>
                        <div >
                            <h3 className="font-semibold text-lg">{unit.unit_title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{unit.unit_summary}</p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {unit.topics.map((topic, topicIndex) => (
                            <AccordionItem value={`topic-${topicIndex}`} key={topicIndex} className='border-b-0 rounded-md bg-background/50 overflow-hidden'>
                                <AccordionTrigger className='px-4 py-3 text-md font-semibold hover:no-underline'>
                                    {topic.topic_title}
                                </AccordionTrigger>
                                <AccordionContent className='px-4 pb-4 prose prose-invert max-w-none'>
                                    <p className='text-muted-foreground'>{topic.explanation}</p>
                                    <h4 className='text-foreground'>Examples</h4>
                                    <ul className='text-muted-foreground'>
                                        {topic.examples.map((example, i) => <li key={i}>{example}</li>)}
                                    </ul>
                                    <h4 className='text-foreground'>Real World Applications</h4>
                                     <ul className='text-muted-foreground'>
                                        {topic.real_world_applications.map((app, i) => <li key={i}>{app}</li>)}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </AccordionContent>
            </AccordionItem>
            ))}
        </Accordion>
        
        <div className='prose prose-invert max-w-none'>
            <h2>Final Summary</h2>
            <p className='text-muted-foreground'>{documentation.final_summary}</p>
        </div>
    </div>
  );
}
