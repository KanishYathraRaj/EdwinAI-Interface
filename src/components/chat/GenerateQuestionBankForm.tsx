'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Chat } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface GenerateQuestionBankFormProps {
    chat: Chat;
    onGenerated: () => void;
    onCancel: () => void;
}

export default function GenerateQuestionBankForm({ chat, onGenerated, onCancel }: GenerateQuestionBankFormProps) {
    const [name, setName] = useState('Question Bank');
    const [description, setDescription] = useState('');
    const [markDistribution, setMarkDistribution] = useState('');
    const [patterns, setPatterns] = useState('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState('Medium');
    const [isGenerating, setIsGenerating] = useState(false);
    const { user } = useUser();
    const { toast } = useToast();

    const syllabus = chat.syllabus;
    const units = syllabus?.units || [];
    if (!syllabus) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Generate Question Bank</CardTitle>
                    <CardDescription>No syllabus found for this subject.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Uploading/reprocessing syllabus is disabled. Create a new subject with syllabus PDF to generate question banks.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" onClick={onCancel}>Back</Button>
                </CardFooter>
            </Card>
        );
    }

    const handleToggleTopic = (topicTitle: string, subtopicsToToggle: string[] = []) => {
        setSelectedTopics(prev => {
            const isCurrentlySelected = prev.includes(topicTitle);
            if (isCurrentlySelected) {
                // Deselect topic and all its subtopics
                return prev.filter(t => t !== topicTitle && !subtopicsToToggle.includes(t));
            } else {
                // Select topic and all its subtopics
                const newTopics = [...prev, topicTitle];
                // Add subtopics that are not already in the array
                subtopicsToToggle.forEach(sub => {
                    if (!newTopics.includes(sub)) {
                        newTopics.push(sub);
                    }
                });
                return newTopics;
            }
        });
    };

    const handleToggleSubtopic = (subtopic: string) => {
        setSelectedTopics(prev =>
            prev.includes(subtopic)
                ? prev.filter(t => t !== subtopic)
                : [...prev, subtopic]
        );
    };

    const handleGenerate = async () => {
        if (!user) return;
        setIsGenerating(true);
        try {
            const response = await fetch('http://127.0.0.1:5005/generate_question_bank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.uid,
                    subject_id: chat.id,
                    subject_slug: (chat as any).slug,
                    parent_type: 'subjects',
                    user_subject_json: chat,
                    selected_topics: selectedTopics,
                    difficulty: difficulty,
                    name: name,
                    description: description,
                    mark_distribution: markDistribution,
                    patterns: patterns
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error || 'Failed to generate question bank');
            }

            toast({
                title: "Generation Started",
                description: "Your question bank is being generated.",
            });
            onGenerated();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Generate Question Bank</CardTitle>
                <CardDescription>Configure and scope your question bank generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-background border rounded-md px-3 py-2 text-sm"
                            placeholder="My Question Bank"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-background border rounded-md px-3 py-2 text-sm min-h-[80px]"
                        placeholder="Brief overview of what this question bank covers..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Mark Distribution</Label>
                        <textarea
                            value={markDistribution}
                            onChange={(e) => setMarkDistribution(e.target.value)}
                            className="w-full bg-background border rounded-md px-3 py-2 text-sm h-20"
                            placeholder="e.g. 10 questions of 2 marks, 5 of 16 marks..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Specific Patterns</Label>
                        <textarea
                            value={patterns}
                            onChange={(e) => setPatterns(e.target.value)}
                            className="w-full bg-background border rounded-md px-3 py-2 text-sm h-20"
                            placeholder="e.g. Include case studies, focus on Part B..."
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <Label>Select Topics (Leave empty for full syllabus)</Label>
                    <div className="max-h-[30vh] overflow-y-auto border rounded-md p-2 scrollbar-thin">
                        <Accordion type="multiple" className="w-full">
                            {units.map((unit, uIdx) => {
                                const unitTitle = unit.unit_title || `Unit ${uIdx + 1}`;
                                const unitLabel = unit.unit_number ? `${unit.unit_number}: ${unitTitle}` : unitTitle;

                                return (
                                    <AccordionItem value={`unit-${uIdx}`} key={uIdx} className="border-b-0">
                                        <AccordionTrigger className="hover:no-underline py-2">
                                            <span className="text-sm font-semibold">{unitLabel}</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-4 pl-4 pt-2 pb-2">
                                            {(unit as any).topics?.map((topic: any, tIdx: number) => {
                                                const topicTitle = topic.title || topic.topic_title || `Topic ${tIdx + 1}`;
                                                const subtopics = topic.subtopics || topic.sub_topics || [];

                                                return (
                                                    <div key={tIdx} className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                id={`topic-${uIdx}-${tIdx}`}
                                                                checked={selectedTopics.includes(topicTitle)}
                                                                onCheckedChange={() => handleToggleTopic(topicTitle, subtopics)}
                                                            />
                                                            <Label htmlFor={`topic-${uIdx}-${tIdx}`} className="text-sm font-bold uppercase tracking-tight opacity-80 cursor-pointer">
                                                                {topicTitle}
                                                            </Label>
                                                        </div>
                                                        {subtopics.length > 0 && (
                                                            <div className="ml-6 space-y-1 border-l pl-4">
                                                                {subtopics.map((sub: string, sIdx: number) => (
                                                                    <div key={sIdx} className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            id={`sub-${uIdx}-${tIdx}-${sIdx}`}
                                                                            checked={selectedTopics.includes(sub)}
                                                                            onCheckedChange={() => handleToggleSubtopic(sub)}
                                                                        />
                                                                        <Label htmlFor={`sub-${uIdx}-${tIdx}-${sIdx}`} className="text-xs cursor-pointer">{sub}</Label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate New Question Bank'}
                </Button>
            </CardFooter>
        </Card>
    );
}
