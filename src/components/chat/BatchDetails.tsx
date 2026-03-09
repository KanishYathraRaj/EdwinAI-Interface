'use client';
import { useRouter } from 'next/navigation';
import { Batch, Subject } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Users, FileText, ClipboardList, Clock3, CheckCircle2, ListChecks } from 'lucide-react';
import { Progress } from '../ui/progress';

interface BatchDetailsProps {
    batch: Batch;
    subject: Subject | undefined;
    onSelectTab: (tab: string) => void;
}

export default function BatchDetails({ batch, subject, onSelectTab }: BatchDetailsProps) {
    const router = useRouter();
    const completedCount = batch.completed_subtopics?.length || 0;
    const totalTopics = subject?.syllabus?.units?.reduce((acc, unit) => acc + unit.topics.length, 0) || 0;
    const progress = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
    const upcoming = (batch.scheduledTopics || [])
        .filter((slot) => slot.status === 'scheduled')
        .sort((a, b) => {
            const aKey = `${a.date}T${a.startTime || '00:00'}`;
            const bKey = `${b.date}T${b.startTime || '00:00'}`;
            return aKey.localeCompare(bKey);
        });
    const nextSession = upcoming[0];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">{batch.batch_name}</h1>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Active</Badge>
                    </div>
                    <p className="text-muted-foreground">
                        {subject?.subject_name} • Started on {batch.startDate || 'N/A'}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/settings/scheduler')}>
                    <Clock3 className="mr-2 h-4 w-4" />
                    Open Scheduler
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                Course Progress
                            </CardTitle>
                            <CardDescription>Overall completion of the syllabus topics.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground font-medium">{progress}% Complete</span>
                                <span className="font-bold">{completedCount} / {totalTopics} Topics</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onSelectTab('assessments')}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-primary" />
                                    Upcoming Topics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{upcoming.length}</p>
                                <p className="text-[10px] text-muted-foreground">Sessions already scheduled</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onSelectTab('assessments')}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Assessments
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">View</p>
                                <p className="text-[10px] text-muted-foreground">Create and review assessments</p>
                            </CardContent>
                        </Card>
                    </div>

                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Next Session
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-3 rounded-lg border bg-primary/5 border-primary/10">
                                <p className="text-xs font-semibold text-primary uppercase mb-1">Upcoming</p>
                                {nextSession ? (
                                    <>
                                        <p className="text-sm font-bold">{nextSession.topicTitle}</p>
                                        <p className="text-[10px] text-muted-foreground">{nextSession.date}, {nextSession.startTime} - {nextSession.endTime}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No upcoming sessions yet.</p>
                                )}
                            </div>
                            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => onSelectTab('students')}>
                                <Users className="mr-2 h-4 w-4" />
                                View Students
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
