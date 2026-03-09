'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Calendar, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useToast } from '@/hooks/use-toast';
import { Batch, DailyAvailability, Subject } from '@/types/database';
import { SequentialScheduler } from '@/lib/scheduling';
import { cn, handleApiResponse, slugify } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_START_MIN = 7 * 60;   // 07:00
const TIME_END_MIN = 22 * 60;    // 22:00
const SLOT_STEP_MIN = 15;        // 15-min precision internally
const PIXELS_PER_HOUR = 52;
const TIMELINE_HEIGHT = ((TIME_END_MIN - TIME_START_MIN) / 60) * PIXELS_PER_HOUR;
const HOUR_MARKERS = Array.from({ length: (TIME_END_MIN - TIME_START_MIN) / 60 + 1 }, (_, i) => TIME_START_MIN + (i * 60));

const BATCH_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
];

type CellAssignments = Record<string, string>; // key: "day-minute" -> batchId

interface DragState {
    day: number;
    start: number;
    current: number;
}

interface DayBlock {
    batchId: string;
    start: number;
    end: number;
}

function hhmm(totalMinutes: number) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatHour(totalMinutes: number) {
    const h = Math.floor(totalMinutes / 60);
    if (h === 12) return '12 PM';
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
}

function parseToMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    if (!Number.isFinite(h)) return 0;
    if (!Number.isFinite(m)) return h * 60;
    return (h * 60) + m;
}

function snapToStep(minutes: number) {
    const clamped = Math.max(TIME_START_MIN, Math.min(TIME_END_MIN, minutes));
    const relative = clamped - TIME_START_MIN;
    const snapped = Math.round(relative / SLOT_STEP_MIN) * SLOT_STEP_MIN;
    return TIME_START_MIN + snapped;
}

function minuteFromPointer(clientY: number, container: HTMLDivElement) {
    const rect = container.getBoundingClientRect();
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    // Use fixed pixels-per-hour so pointer mapping stays aligned with visual hour markers.
    const minutes = TIME_START_MIN + (y / PIXELS_PER_HOUR) * 60;
    return snapToStep(minutes);
}

function buildInitialAssignments(batches: Batch[]): CellAssignments {
    const assignments: CellAssignments = {};

    batches.forEach((batch) => {
        (batch.availability || []).forEach((dayAvail) => {
            (dayAvail.slots || []).forEach((slot) => {
                const startMin = parseToMinutes(slot.startTime);
                const endMin = parseToMinutes(slot.endTime);
                for (let minute = startMin; minute < endMin; minute += SLOT_STEP_MIN) {
                    if (minute >= TIME_START_MIN && minute < TIME_END_MIN) {
                        assignments[`${dayAvail.dayOfWeek}-${minute}`] = batch.id;
                    }
                }
            });
        });
    });

    return assignments;
}

function assignmentsToAvailability(batchId: string, assignments: CellAssignments): DailyAvailability[] {
    const byDay: Record<number, number[]> = {};

    Object.entries(assignments).forEach(([key, assignedBatchId]) => {
        if (assignedBatchId !== batchId) return;
        const [dayStr, minuteStr] = key.split('-');
        const day = Number(dayStr);
        const minute = Number(minuteStr);
        if (!Number.isFinite(day) || !Number.isFinite(minute)) return;
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(minute);
    });

    const availability: DailyAvailability[] = [];

    Object.keys(byDay)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((day) => {
            const points = [...new Set(byDay[day])].sort((a, b) => a - b);
            if (points.length === 0) return;

            const slots: { startTime: string; endTime: string }[] = [];
            let start = points[0];
            let prev = points[0];

            for (let i = 1; i < points.length; i++) {
                const curr = points[i];
                if (curr === prev + SLOT_STEP_MIN) {
                    prev = curr;
                    continue;
                }

                slots.push({ startTime: hhmm(start), endTime: hhmm(prev + SLOT_STEP_MIN) });
                start = curr;
                prev = curr;
            }

            slots.push({ startTime: hhmm(start), endTime: hhmm(prev + SLOT_STEP_MIN) });
            availability.push({ dayOfWeek: day, slots });
        });

    return availability;
}

function buildDayBlocks(assignments: CellAssignments, day: number): DayBlock[] {
    const blocks: DayBlock[] = [];
    let activeBatch: string | null = null;
    let activeStart = TIME_START_MIN;

    for (let minute = TIME_START_MIN; minute <= TIME_END_MIN; minute += SLOT_STEP_MIN) {
        const owner = minute < TIME_END_MIN ? assignments[`${day}-${minute}`] || null : null;
        if (owner !== activeBatch) {
            if (activeBatch) {
                blocks.push({ batchId: activeBatch, start: activeStart, end: minute });
            }
            activeBatch = owner;
            activeStart = minute;
        }
    }

    return blocks;
}

function AvailabilitySettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const batchesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/batches`), orderBy('createdAt', 'desc'));
    }, [firestore, user]);
    const { data: batches, isLoading: batchesLoading } = useCollection<Batch>(batchesQuery);

    const subjectsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/subjects`), orderBy('createdAt', 'desc'));
    }, [firestore, user]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [assignments, setAssignments] = useState<CellAssignments>({});
    const [drag, setDrag] = useState<DragState | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [hasInitializedAssignments, setHasInitializedAssignments] = useState(false);

    const batchColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        (batches || []).forEach((b, i) => {
            map[b.id] = BATCH_COLORS[i % BATCH_COLORS.length];
        });
        return map;
    }, [batches]);

    const subjectMap = useMemo(() => {
        const map: Record<string, Subject> = {};
        (subjects || []).forEach((s) => {
            map[s.id] = s;
        });
        return map;
    }, [subjects]);

    const blocksByDay = useMemo(() => {
        const out: Record<number, DayBlock[]> = {};
        for (let d = 0; d < 7; d++) {
            out[d] = buildDayBlocks(assignments, d);
        }
        return out;
    }, [assignments]);

    useEffect(() => {
        if (!batches || batches.length === 0) return;
        setAssignments(buildInitialAssignments(batches));
        setSelectedBatchId((prev) => prev || batches[0].id);
        setHasInitializedAssignments(true);
    }, [batches]);

    useEffect(() => {
        const onMouseUp = () => {
            if (!drag || !selectedBatchId) return;
            const start = Math.min(drag.start, drag.current);
            const end = Math.max(drag.start, drag.current) + SLOT_STEP_MIN;

            setAssignments((prev) => {
                const next = { ...prev };
                for (let minute = start; minute < end; minute += SLOT_STEP_MIN) {
                    next[`${drag.day}-${minute}`] = selectedBatchId;
                }
                return next;
            });
            setDrag(null);
        };

        window.addEventListener('mouseup', onMouseUp);
        return () => window.removeEventListener('mouseup', onMouseUp);
    }, [drag, selectedBatchId]);

    const clearSelectedBatchSlots = () => {
        if (!selectedBatchId) return;
        setAssignments((prev) => {
            const next: CellAssignments = {};
            Object.entries(prev).forEach(([k, v]) => {
                if (v !== selectedBatchId) next[k] = v;
            });
            return next;
        });
    };

    const handleBlockRemove = (day: number, start: number, end: number, batchId: string) => {
        if (batchId !== selectedBatchId) return;
        setAssignments((prev) => {
            const next = { ...prev };
            for (let minute = start; minute < end; minute += SLOT_STEP_MIN) {
                delete next[`${day}-${minute}`];
            }
            return next;
        });
    };

    const persistAssignments = async (silent: boolean = false) => {
        if (!user || !batches) return;

        setIsSaving(true);
        setSaveState('saving');
        try {
            const scheduler = new SequentialScheduler();
            const accumulatedSchedules: Record<string, any[]> = {};

            for (const batch of batches) {
                const availability = assignmentsToAvailability(batch.id, assignments);
                const subject = subjectMap[batch.subject_id];

                // Always rebuild schedule from current slot assignments to avoid stale time blocks.
                let scheduledTopics: any[] = [];
                if (subject?.syllabus && batch.startDate && batch.endDate && availability.length > 0) {
                    const otherSchedules = Object.entries(accumulatedSchedules)
                        .filter(([otherBatchId]) => otherBatchId !== batch.id)
                        .flatMap(([, slots]) => slots);
                    scheduledTopics = scheduler.generate(subject.syllabus as any, {
                        startDate: batch.startDate,
                        endDate: batch.endDate,
                        availability,
                        previousSchedule: [],
                        otherSchedules,
                    });
                }
                accumulatedSchedules[batch.id] = scheduledTopics;

                const ref = doc(firestore, `users/${user.uid}/batches/${batch.id}`);
                await updateDoc(ref, {
                    availability,
                    scheduledTopics,
                    updated_at: new Date().toISOString(),
                });
            }

            setSaveState('saved');
            if (!silent) {
                toast({
                    title: 'Scheduler Saved',
                    description: 'Batch slot assignments are updated. Overlaps are prevented by design.',
                });
            }
        } catch (error: any) {
            setSaveState('error');
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: error?.message || 'Could not save scheduler configuration.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!hasInitializedAssignments || isSaving) return;
        const timer = window.setTimeout(() => {
            void persistAssignments(true);
        }, 1200);
        return () => window.clearTimeout(timer);
    }, [assignments, hasInitializedAssignments]);

    useEffect(() => {
        if (saveState !== 'saved') return;
        const timer = window.setTimeout(() => setSaveState('idle'), 1400);
        return () => window.clearTimeout(timer);
    }, [saveState]);

    const addSubject = async (title: string, file: File) => {
        if (!user) return;
        try {
            const subjectSlug = slugify(title || 'New Subject');
            const docRef = await addDoc(collection(firestore, `users/${user.uid}/subjects`), {
                user_id: user.uid,
                subject_name: title || 'New Subject',
                slug: subjectSlug,
                syllabus_status: 'processing',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                conversation_history: [],
                resources: [],
            });
            const subjectId = docRef.id;
            try {
                const formData = new FormData();
                formData.append('user_id', user.uid);
                formData.append('subject_id', subjectId);
                if (subjectSlug) formData.append('subject_slug', subjectSlug);
                formData.append('file', file);

                const endpoint = 'http://127.0.0.1:5005/upsert_syllabus';
                const response = await fetch(endpoint, { method: 'POST', body: formData });
                await handleApiResponse(response, endpoint);

                await updateDoc(doc(firestore, `users/${user.uid}/subjects`, subjectId), {
                    syllabus_status: 'ready',
                    updatedAt: serverTimestamp(),
                });

                toast({ title: 'Subject Created', description: 'Syllabus processed successfully.' });
            } catch (e) {
                await deleteDoc(doc(firestore, `users/${user.uid}/subjects`, subjectId));
                throw e;
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Could not create subject.' });
        }
    };

    if (batchesLoading || subjectsLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <SidebarProvider>
                <Sidebar collapsible="icon" className="bg-sidebar">
                    <ChatSidebar
                        subjects={subjects || []}
                        batches={batches || []}
                        activeId={null}
                        activeType="home"
                        onNewSubject={addSubject}
                        onNewBatch={(subjectId) => {
                            const subject = (subjects || []).find((s) => s.id === subjectId);
                            if (!subject) return;
                            router.push(`/subject/${subject.slug || subject.id}/details`);
                        }}
                        onSelectSubject={(id) => {
                            const s = subjects?.find(c => c.id === id);
                            const isReady = !!s?.syllabus?.units?.length || s?.syllabus_status === 'ready';
                            if (!isReady || !s) return;
                            router.push(`/subject/${s.slug || s.id}/details`);
                        }}
                        onSelectBatch={(id) => {
                            const b = batches?.find(batch => batch.id === id);
                            router.push(`/batch/${b?.slug || id}/details`);
                        }}
                        onDeleteSubject={() => toast({ title: 'Manage from subject page', description: 'Delete from subject details view.' })}
                        onDeleteBatch={() => toast({ title: 'Manage from batch page', description: 'Delete from batch details view.' })}
                        onRenameSubject={() => toast({ title: 'Manage from subject page', description: 'Rename from subject details view.' })}
                        onSelectHome={() => router.push('/')}
                        isLoading={false}
                    />
                </Sidebar>
                <SidebarInset className="bg-sidebar overflow-hidden relative border-l border-border/20">
                    <div className="w-full h-full p-[1vh_1vw] space-y-[1vh] animate-in fade-in duration-500 overflow-auto">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">Weekly Scheduler</h1>
                            <p className="text-muted-foreground">Teams-style drag selection. Choose batch, then drag on a day column to assign time ranges. Auto-save is enabled.</p>
                            <p className={cn(
                                'text-xs font-medium',
                                saveState === 'saving' && 'text-amber-500',
                                saveState === 'saved' && 'text-emerald-500',
                                saveState === 'error' && 'text-destructive',
                                saveState === 'idle' && 'text-muted-foreground'
                            )}>
                                {saveState === 'saving' && 'Saving changes...'}
                                {saveState === 'saved' && 'All changes saved'}
                                {saveState === 'error' && 'Auto-save failed'}
                                {saveState === 'idle' && 'Auto-save ready'}
                            </p>
                        </div>

                        {!batches || batches.length === 0 ? (
                            <div className="w-full h-full min-h-[60vh] flex items-center justify-center">
                                <div className="text-center space-y-2">
                                    <h2 className="text-xl font-semibold">No Batches Available</h2>
                                    <p className="text-sm text-muted-foreground">Create subjects and batches first. Scheduler assignments depend on batches.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Card className="border-border/40 bg-card/40">
                                    <CardHeader>
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div>
                                                <CardTitle className="text-xl flex items-center gap-2">
                                                    <Calendar className="h-5 w-5 text-primary" />
                                                    Weekly Batch Allocation
                                                </CardTitle>
                                                <CardDescription>
                                                    Drag to create slots. A slot belongs to one batch only. Click a selected batch block to remove it.
                                                </CardDescription>
                                            </div>
                                            <div className="flex gap-2">
                                                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                                                    <SelectTrigger className="w-[260px]">
                                                        <SelectValue placeholder="Select batch" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(batches || []).map((b) => (
                                                            <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button variant="outline" onClick={clearSelectedBatchSlots} disabled={!selectedBatchId}>
                                                    <Eraser className="h-4 w-4 mr-2" />
                                                    Clear Batch
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="overflow-x-auto">
                                            <div className="min-w-[980px] grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border border-border/50 rounded-xl overflow-hidden">
                                                <div className="border-r border-border/40">
                                                    <div className="h-10 border-b border-border/40 bg-muted/20 px-2 flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                        Time
                                                    </div>
                                                    <div className="bg-muted/20 relative" style={{ height: TIMELINE_HEIGHT, minHeight: TIMELINE_HEIGHT }}>
                                                        {HOUR_MARKERS.map((m) => {
                                                            const top = ((m - TIME_START_MIN) / 60) * PIXELS_PER_HOUR;
                                                            return (
                                                                <div key={m} className="absolute text-[10px] text-muted-foreground -translate-y-1/2 ml-2" style={{ top }}>
                                                                    {formatHour(m)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {DAYS.map((dayName, dayIdx) => (
                                                    <div key={dayName} className="border-l border-border/40">
                                                        <div className="h-10 border-b border-border/40 bg-muted/20 px-2 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                            {dayName}
                                                        </div>
                                                        <div
                                                            className="relative select-none"
                                                            style={{ height: TIMELINE_HEIGHT, minHeight: TIMELINE_HEIGHT }}
                                                            onMouseDown={(e) => {
                                                                if (!selectedBatchId) return;
                                                                const target = e.currentTarget as HTMLDivElement;
                                                                const minute = minuteFromPointer(e.clientY, target);
                                                                setDrag({ day: dayIdx, start: minute, current: minute });
                                                            }}
                                                            onMouseMove={(e) => {
                                                                if (!drag || drag.day !== dayIdx) return;
                                                                const target = e.currentTarget as HTMLDivElement;
                                                                const minute = minuteFromPointer(e.clientY, target);
                                                                setDrag((prev) => (prev ? { ...prev, current: minute } : prev));
                                                            }}
                                                        >
                                                            {HOUR_MARKERS.map((m) => {
                                                                const top = ((m - TIME_START_MIN) / 60) * PIXELS_PER_HOUR;
                                                                return <div key={m} className="absolute left-0 right-0 border-t border-border/20" style={{ top }} />;
                                                            })}

                                                            {(blocksByDay[dayIdx] || []).map((block, i) => {
                                                                const color = batchColorMap[block.batchId] || '#64748b';
                                                                const top = ((block.start - TIME_START_MIN) / 60) * PIXELS_PER_HOUR;
                                                                const height = ((block.end - block.start) / 60) * PIXELS_PER_HOUR;
                                                                const batchName = (batches || []).find((b) => b.id === block.batchId)?.batch_name || 'Batch';

                                                                return (
                                                                    <button
                                                                        key={`${block.batchId}-${block.start}-${i}`}
                                                                        type="button"
                                                                        className={cn(
                                                                            'absolute left-1 right-1 rounded-l-md rounded-r-none px-2 py-1 text-left overflow-hidden border-l-[3px]',
                                                                            'hover:brightness-110 transition-all',
                                                                            block.batchId === selectedBatchId ? 'ring-1 ring-primary/40' : ''
                                                                        )}
                                                                        style={{
                                                                            top,
                                                                            height: Math.max(height, 20),
                                                                            backgroundColor: `${color}26`,
                                                                            borderLeftColor: color,
                                                                            color,
                                                                        }}
                                                                        title={`${batchName} • ${hhmm(block.start)}-${hhmm(block.end)}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleBlockRemove(dayIdx, block.start, block.end, block.batchId);
                                                                        }}
                                                                    >
                                                                        <span className="text-[10px] font-semibold truncate block">{batchName}</span>
                                                                        <span className="text-[9px] opacity-80">{hhmm(block.start)}-{hhmm(block.end)}</span>
                                                                    </button>
                                                                );
                                                            })}

                                                            {drag && drag.day === dayIdx && (
                                                                <div
                                                                    className="absolute left-1 right-1 rounded-md border border-dashed border-primary bg-primary/15 pointer-events-none"
                                                                    style={{
                                                                        top: ((Math.min(drag.start, drag.current) - TIME_START_MIN) / 60) * PIXELS_PER_HOUR,
                                                                        height: Math.max((((Math.max(drag.start, drag.current) + SLOT_STEP_MIN) - Math.min(drag.start, drag.current)) / 60) * PIXELS_PER_HOUR, 14),
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {(batches || []).map((b) => (
                                                <div key={b.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border/40 bg-background/60">
                                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: batchColorMap[b.id] }} />
                                                    <span className="font-medium">{b.batch_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}

export default function AvailabilityPage() {
    return (
        <AuthGuard>
            <AvailabilitySettings />
        </AuthGuard>
    );
}
