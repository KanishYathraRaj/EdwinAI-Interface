'use client';

import { useRouter } from 'next/navigation';
import { Subject, Batch } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { BookOpen, Calendar, Users, PlusCircle, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import SyllabusDisplay from './SyllabusDisplay';

interface SubjectDetailsProps {
    subject: Subject | undefined;
    batches: Batch[];
    onNewBatch: (subjectId: string) => void;
    onSelectBatch: (batchId: string) => void;
}

export default function SubjectDetails({ subject, batches, onNewBatch, onSelectBatch }: SubjectDetailsProps) {
    const router = useRouter();

    if (!subject) {
        return (
            <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-dashed border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Subject Missing
                        </CardTitle>
                        <CardDescription>
                            The original subject for this batch has been deleted.
                            You can still manage the batch specific data (Schedule, Chat, Students) but syllabus-level updates are limited.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const subjectBatches = batches.filter(b => b.subject_id === subject.id);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{subject.subject_name}</h1>
                    <p className="text-muted-foreground">{subject.description || 'No description provided.'}</p>
                </div>
                <Button size="sm" onClick={() => onNewBatch(subject.id)} className="shadow-lg shadow-primary/20">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Batch
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                Syllabus & Documents
                            </CardTitle>
                            <CardDescription>Syllabus is fixed at subject creation and shared across all batches.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {subject.documents && subject.documents.length > 0 ? (
                            <div className="grid gap-4">
                                {subject.documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded bg-primary/10">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{doc.title}</span>
                                                <span className="text-[10px] text-muted-foreground">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.url, '_blank')}>
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : subject.syllabus ? (
                            <SyllabusDisplay
                                syllabus={subject.syllabus}
                                subjectId={subject.id}
                                progressOwnerType="subjects"
                                progressOwnerId={subject.id}
                                completedSubtopics={(subject as any).completed_subtopics || []}
                                subject={subject as any}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg">
                                <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                                <p className="text-muted-foreground text-sm">No syllabus data found for this subject.</p>
                            </div>
                        )}

                        {subject.syllabus && subject.documents && subject.documents.length > 0 && (
                            <div className="pt-4 border-t">
                                <h4 className="text-sm font-semibold mb-4">Extracted Syllabus Preview</h4>
                                <SyllabusDisplay
                                    syllabus={subject.syllabus}
                                    subjectId={subject.id}
                                    progressOwnerType="subjects"
                                    progressOwnerId={subject.id}
                                    completedSubtopics={(subject as any).completed_subtopics || []}
                                    subject={subject as any}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Batches
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {subjectBatches.length > 0 ? (
                                subjectBatches.map(batch => (
                                    <div
                                        key={batch.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => onSelectBatch(batch.id)}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{batch.batch_name}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {batch.startDate || 'No start date'}
                                            </span>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">Active</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-4">No batches created for this subject yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Default Availability
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground mb-4">Assign weekly slots to batches from the Scheduler.</p>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/settings/scheduler')}>Open Scheduler</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
