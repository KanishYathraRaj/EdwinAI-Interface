'use client';

import { useState, useMemo } from 'react';
import { Subject, Batch, DailyAvailability, ScheduledSlot, Syllabus } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Calendar as CalendarIcon, Save, RefreshCw, AlertCircle, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { SequentialScheduler, rescheduleFromDate } from '@/lib/scheduling';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ScheduleDisplayProps {
    data: Subject | Batch;
    type: 'subject' | 'batch';
    allBatches?: Batch[];
    allSubjects?: Subject[];
}

export default function ScheduleDisplay({ data, type, allBatches = [], allSubjects = [] }: ScheduleDisplayProps) {
    const chat = data as any;
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [startDate, setStartDate] = useState(chat.startDate || '');
    const [endDate, setEndDate] = useState(chat.endDate || '');
    const availability: DailyAvailability[] = chat.availability || [];
    const [isUpdating, setIsUpdating] = useState(false);

    // We show the current scheduled topics from the subject prop, 
    // but if the user "regenerates", we show the local preview.
    const [localSchedule, setLocalSchedule] = useState<ScheduledSlot[] | null>(null);

    const displaySchedule = localSchedule || chat.scheduledTopics || [];

    // Compatibility helper for SequentialScheduler which might still expect numberOfSlots
    const compatibleAvailability = useMemo(() => {
        return availability.map(a => ({
            ...a,
            numberOfSlots: a.slots?.length || 0,
            slotDurationInMinutes: 60 // Default fallback
        }));
    }, [availability]);

    const handleGenerate = () => {
        let syllabus = chat.syllabus;
        if (type === 'batch' && !syllabus) {
            const parent = allSubjects.find(s => s.id === (data as Batch).subject_id);
            syllabus = parent?.syllabus;
        }

        if ((!syllabus || !syllabus.units) || !startDate || !endDate || availability.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please provide start/end date and assign batch slots in Scheduler.',
            });
            return;
        }

        const otherSlots: ScheduledSlot[] = [];
        allBatches.forEach(b => {
            if (b.id !== chat.id && b.scheduledTopics) {
                otherSlots.push(...b.scheduledTopics);
            }
        });

        const scheduler = new SequentialScheduler();

        const newSchedule = scheduler.generate((syllabus || {}) as Syllabus, {
            startDate,
            endDate,
            availability: compatibleAvailability as any,
            otherSchedules: otherSlots
        });
        setLocalSchedule(newSchedule);
        toast({
            title: 'Schedule Generated',
            description: 'Review the preview and click Save to apply changes.',
        });
    };

    const handleSave = async () => {
        if (!user || !chat.id) return;
        setIsUpdating(true);
        try {
            const collectionName = type === 'subject' ? 'subjects' : 'batches';
            const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, chat.id);
            await updateDoc(docRef, {
                startDate,
                endDate,
                scheduledTopics: displaySchedule,
                updated_at: new Date().toISOString(),
            });
            setLocalSchedule(null);
            toast({
                title: 'Schedule Saved',
                description: 'Your changes have been saved to the database.',
            });
        } catch (error: any) {
            console.error('Error saving schedule:', error);
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: error.message || 'An error occurred while saving.',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleMarkStatus = async (slotId: string, status: ScheduledSlot['status']) => {
        if (!user || !chat.id) return;

        // Find slot and update locally
        const updatedSchedule = displaySchedule.map((slot: ScheduledSlot) =>
            slot.id === slotId ? { ...slot, status } : slot
        );

        // If status is 'missed' or 'cancelled', we should optionally offer to reschedule.
        // For now, let's just update the status.
        setIsUpdating(true);
        try {
            const collectionName = type === 'subject' ? 'subjects' : 'batches';
            const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, chat.id);

            let finalSchedule = updatedSchedule;
            if (status === 'missed' || status === 'cancelled') {
                const slot = updatedSchedule.find((s: ScheduledSlot) => s.id === slotId);
                if (slot) {
                    // Find syllabus
                    let syllabusToUse = chat.syllabus;
                    if (type === 'batch' && !syllabusToUse) {
                        syllabusToUse = allSubjects.find(s => s.id === (chat as Batch).subject_id)?.syllabus;
                    }

                    // Find other slots for conflict detection
                    const otherSlots: ScheduledSlot[] = [];
                    allBatches.forEach(b => {
                        if (b.id !== chat.id && b.scheduledTopics) {
                            otherSlots.push(...b.scheduledTopics);
                        }
                    });

                    finalSchedule = rescheduleFromDate(
                        { ...chat, scheduledTopics: updatedSchedule, availability, startDate, endDate } as Batch,
                        syllabusToUse as Syllabus,
                        slot.date,
                        otherSlots,
                        undefined
                    );
                }
            }

            await updateDoc(docRef, {
                scheduledTopics: finalSchedule,
                updated_at: new Date().toISOString(),
            });

            toast({
                title: `Status Updated`,
                description: `Slot marked as ${status}. ${status === 'missed' ? 'Future slots rescheduled.' : ''}`,
            });
        } catch (error: any) {
            console.error('Error updating slot:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Simple Grouping for Calendar
    const scheduleByDate = useMemo(() => {
        const acc: Record<string, ScheduledSlot[]> = {};
        displaySchedule.forEach((slot: ScheduledSlot) => {
            if (!acc[slot.date]) acc[slot.date] = [];
            acc[slot.date].push(slot);
        });
        return acc;
    }, [displaySchedule]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Availability Settings */}
                <Card className="md:col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            Settings
                        </CardTitle>
                        <CardDescription>Configure course duration and use batch slots from Scheduler</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Course Start Date</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Course End Date</Label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>

                        <div className="pt-4 border-t border-border/50">
                            <Label className="text-sm font-semibold mb-2 block">Assigned Weekly Slots</Label>
                            {availability.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border/50 p-3 text-xs text-muted-foreground space-y-2">
                                    <p>No slots assigned for this batch.</p>
                                    <p>Open Scheduler and allocate slots to this batch.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    {days.map((day, index) => {
                                        const dayAvail = availability.find(a => a.dayOfWeek === index);
                                        if (!dayAvail || dayAvail.slots.length === 0) return null;
                                        return (
                                            <div key={day} className="p-2 rounded-md border border-border/40 bg-muted/20">
                                                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1">{day}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {dayAvail.slots.map(s => `${s.startTime}-${s.endTime}`).join(', ')}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-3"
                                onClick={() => router.push('/settings/scheduler')}
                            >
                                <Settings className="h-3.5 w-3.5 mr-2" />
                                Open Scheduler
                            </Button>
                        </div>

                        <div className="pt-4 flex gap-2">
                            <Button onClick={handleGenerate} variant="outline" className="flex-1 text-xs h-9">
                                <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isUpdating && "animate-spin")} />
                                Regenerate
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isUpdating || (!localSchedule && startDate === chat.startDate && endDate === chat.endDate)}
                                className="flex-1 text-xs h-9"
                            >
                                <Save className="mr-2 h-3.5 w-3.5" />
                                Save
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Schedule/Calendar View */}
                <Card className="md:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Schedule Calendar</CardTitle>
                        <CardDescription>Planned distribution of syllabus topics</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[400px]">
                        {displaySchedule.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center border-2 border-dashed border-border/50 rounded-xl">
                                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                                <p className="text-muted-foreground">No schedule generated yet.</p>
                                <p className="text-xs text-muted-foreground/60">Set dates, assign batch slots in Scheduler, then click Regenerate.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Simplified List View for now, grouped by date */}
                                {Object.keys(scheduleByDate).sort().map(date => (
                                    <div key={date} className="relative pl-6 border-l border-border/50 last:border-0 pb-6">
                                        <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-semibold">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {scheduleByDate[date].map(slot => (
                                                <div key={slot.id} className={cn(
                                                    "edwin-event-card h-full rounded-lg border flex flex-col justify-between px-3 py-2 cursor-pointer transition-all group",
                                                    slot.status === 'completed' ? "bg-green-500/5 border-green-500/20" :
                                                        slot.status === 'missed' ? "bg-red-500/5 border-red-500/20 opacity-70" : "bg-background hover:bg-accent/30 border-border",
                                                )} style={{ borderColor: slot.color || '#3b82f6', minHeight: '48px', margin: '2px 0', position: 'relative', background: 'transparent' }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: slot.color || '#3b82f6' }} />
                                                        <span className="font-semibold text-[8px] text-foreground/80">{slot.batchName || ''}</span>
                                                        <span className="ml-auto text-[10px] text-muted-foreground">{slot.startTime || ''}</span>
                                                    </div>
                                                    <div className="font-semibold text-xs text-primary truncate">{slot.topicTitle || 'Untitled Topic'}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate">{slot.unitTitle || ''}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {slot.status === 'scheduled' && (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleMarkStatus(slot.id, 'completed')}>
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleMarkStatus(slot.id, 'missed')}>
                                                                    <AlertCircle className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {slot.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                        {slot.status === 'missed' && <XCircle className="h-4 w-4 text-red-500" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
