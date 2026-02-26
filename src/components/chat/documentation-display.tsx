'use client';

import type { Documentation } from '@/lib/types';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Share, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DocumentationDisplayProps {
    documentation: Documentation;
    onPublish: (title: string, content: string, onSuccess?: () => void) => void;
    isPublishing?: boolean;
}

export default function DocumentationDisplay({ documentation, onPublish, isPublishing }: DocumentationDisplayProps) {
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark' || theme === 'classic-dark';
    const [publishedLocally, setPublishedLocally] = useState(documentation?.published_to_gcr || false);

    useEffect(() => {
        setPublishedLocally(documentation?.published_to_gcr || false);
    }, [documentation]);

    if (!documentation) {
        return null;
    }

    const handlePublish = () => {
        let content = `# ${documentation.course_title}\n\n${documentation.overview}\n\n`;
        documentation.units?.forEach(unit => {
            content += `## ${unit.unit_number}: ${unit.unit_title}\n${unit.unit_summary}\n\n`;
            unit.topics?.forEach(topic => {
                content += `### ${topic.topic_title}\n${topic.explanation}\n\n`;
                if (topic.examples?.length) {
                    content += `**Examples:**\n${topic.examples.map(e => `- ${e}`).join('\n')}\n\n`;
                }
                if (topic.real_world_applications?.length) {
                    content += `**Real World Applications:**\n${topic.real_world_applications.map(a => `- ${a}`).join('\n')}\n\n`;
                }
                if (topic.pitfalls?.length) {
                    content += `**Common Pitfalls:**\n${topic.pitfalls.map(p => `- ${p}`).join('\n')}\n\n`;
                }
            });
        });
        content += `\n---\n${documentation.final_summary}`;
        onPublish(documentation.course_title, content, () => setPublishedLocally(true));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-6 rounded-lg border border-border/50">
                <div className={cn("prose max-w-none", isDark && "prose-invert")}>
                    <h2 className="m-0 leading-tight">Overview</h2>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            if (publishedLocally) {
                                setPublishConfirmOpen(true);
                            } else {
                                handlePublish();
                            }
                        }}
                        disabled={isPublishing}
                        className={cn(
                            "shrink-0 transition-all",
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
                                    <Button onClick={() => { handlePublish(); setPublishConfirmOpen(false); }}>
                                        Republish
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className={cn("prose max-w-none bg-card p-6 rounded-lg border border-border/50", isDark && "prose-invert")}>
                <p className='text-muted-foreground m-0'>{documentation.overview}</p>
            </div>

            <Accordion type="multiple" defaultValue={documentation.units?.map(u => `unit-${u.unit_number}`) || []} className="w-full">
                {documentation.units?.map((unit) => (
                    <AccordionItem value={`unit-${unit.unit_number}`} key={unit.unit_number} className="mb-4 border border-border/30 rounded-lg bg-card overflow-hidden">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline bg-muted/20 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-4 text-left">
                                <span className="text-lg font-bold text-primary">
                                    {unit.unit_number}
                                </span>
                                <div >
                                    <h3 className="font-semibold text-lg">{unit.unit_title}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{unit.unit_summary}</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-4">
                            <Accordion type="multiple" className="w-full space-y-4">
                                {unit.topics?.map((topic, topicIndex) => (
                                    <AccordionItem value={`topic-${topicIndex}`} key={topicIndex} className='border border-border/20 rounded-md bg-muted/10 overflow-hidden'>
                                        <AccordionTrigger className='px-4 py-3 text-sm font-bold hover:no-underline bg-muted/5 hover:bg-muted/10 transition-colors'>
                                            {topic.topic_title}
                                        </AccordionTrigger>
                                        <AccordionContent className={cn('px-4 pb-4 pt-4 prose max-w-none', isDark && "prose-invert")}>
                                            <p className='text-muted-foreground leading-relaxed'>{topic.explanation}</p>

                                            <div className="grid md:grid-cols-2 gap-6 mt-4">
                                                <div>
                                                    <h4 className='text-foreground text-sm font-bold uppercase tracking-tight mb-2'>Examples</h4>
                                                    <ul className='text-muted-foreground text-sm space-y-1'>
                                                        {topic.examples?.map((example, i) => <li key={i}>{example}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className='text-foreground text-sm font-bold uppercase tracking-tight mb-2'>Real World Applications</h4>
                                                    <ul className='text-muted-foreground text-sm space-y-1'>
                                                        {topic.real_world_applications?.map((app, i) => <li key={i}>{app}</li>)}
                                                    </ul>
                                                </div>
                                            </div>

                                            {topic.pitfalls && topic.pitfalls.length > 0 && (
                                                <div className="mt-6 p-4 rounded-md bg-red-500/5 border border-red-500/20">
                                                    <h4 className='text-red-400 text-sm font-bold uppercase tracking-tight mb-2 flex items-center gap-2'>
                                                        Common Pitfalls
                                                    </h4>
                                                    <ul className='text-muted-foreground text-sm space-y-1'>
                                                        {topic.pitfalls?.map((pitfall, i) => <li key={i} className="flex gap-2">
                                                            <span className="text-red-500/50">•</span>
                                                            {pitfall}
                                                        </li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            <div className={cn('prose max-w-none p-6 bg-card border border-border/50 rounded-lg', isDark && "prose-invert")}>
                <h2 className="m-0 mb-4">Final Summary</h2>
                <p className='text-muted-foreground m-0'>{documentation.final_summary}</p>
            </div>
        </div>
    );
}
