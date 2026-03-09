'use client';

import React, { useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import { Batch, ScheduledSlot, Subject } from '@/types/database';
import {
    addDays,
    addMonths,
    addWeeks,
    eachDayOfInterval,
    format,
    isSameDay,
    isSameMonth,
    isValid,
    parseISO,
    startOfMonth,
    startOfWeek,
    subMonths,
    subWeeks,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock3, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GlobalWeeklyCalendarProps {
    subjects: Subject[];
    batches: Batch[];
}

type CalendarSlot = ScheduledSlot & {
    batchName: string;
    subjectName: string;
    color: string;
    batchId: string;
    childSlots?: ScheduledSlot[];
};

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

function parseClockMinutes(value?: string, fallback: string = '09:00') {
    const input = (value || fallback).trim();
    const ampm = input.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])/);
    if (ampm) {
        let h = Number(ampm[1]);
        const m = Number(ampm[2]);
        const period = ampm[3].toLowerCase();
        if (period === 'pm' && h < 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        return h * 60 + m;
    }
    const plain = input.match(/^(\d{1,2}):(\d{2})/);
    if (plain) {
        return Number(plain[1]) * 60 + Number(plain[2]);
    }
    const [fh, fm] = fallback.split(':').map(Number);
    return ((Number.isFinite(fh) ? fh : 9) * 60) + (Number.isFinite(fm) ? fm : 0);
}

function getSlotDate(rawDate: unknown) {
    if (!rawDate) return null;
    if (rawDate instanceof Date) {
        return isValid(rawDate) ? rawDate : null;
    }
    if (typeof rawDate === 'object' && rawDate !== null) {
        const maybeTimestamp = rawDate as {
            toDate?: () => Date;
            seconds?: number;
        };
        if (typeof maybeTimestamp.toDate === 'function') {
            const converted = maybeTimestamp.toDate();
            return isValid(converted) ? converted : null;
        }
        if (typeof maybeTimestamp.seconds === 'number') {
            const converted = new Date(maybeTimestamp.seconds * 1000);
            return isValid(converted) ? converted : null;
        }
    }
    if (typeof rawDate !== 'string') return null;
    try {
        const parsed = parseISO(rawDate);
        if (isValid(parsed)) return parsed;
    } catch {
        // ignore
    }
    const fallback = new Date(rawDate);
    return isValid(fallback) ? fallback : null;
}

function toIsoDateTime(date: Date, time?: string, fallback: string = '09:00') {
    const minutes = parseClockMinutes(time, fallback);
    const next = new Date(date);
    next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return next.toISOString();
}

function mergeContiguousSlots(slots: CalendarSlot[]) {
    const sorted = [...slots].sort((a, b) => {
        const aKey = `${a.batchId}|${a.date}|${a.startTime || '00:00'}`;
        const bKey = `${b.batchId}|${b.date}|${b.startTime || '00:00'}`;
        return aKey.localeCompare(bKey);
    });

    const merged: CalendarSlot[] = [];
    for (const slot of sorted) {
        const previous = merged[merged.length - 1];
        const canMerge = previous
            && previous.batchId === slot.batchId
            && previous.date === slot.date
            && previous.status === slot.status
            && (previous.endTime || '') === (slot.startTime || '');

        if (!canMerge) {
            merged.push({ ...slot, childSlots: slot.childSlots || [slot] });
            continue;
        }

        previous.endTime = slot.endTime;
        previous.durationInMinutes = (previous.durationInMinutes || 0) + (slot.durationInMinutes || 0);
        previous.childSlots = [...(previous.childSlots || []), ...(slot.childSlots || [slot])];
        const firstTopic = previous.childSlots[0]?.topicTitle || previous.topicTitle;
        const extraCount = previous.childSlots.length - 1;
        previous.topicTitle = extraCount > 0 ? `${firstTopic} +${extraCount} more` : firstTopic;
    }

    return merged;
}

export function GlobalWeeklyCalendar({ subjects, batches }: GlobalWeeklyCalendarProps) {
    const calendarRef = useRef<FullCalendar | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
    const [activeSlot, setActiveSlot] = useState<CalendarSlot | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<{ slot: CalendarSlot; pos: { x: number; y: number } } | null>(null);

    const miniCalStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const miniCalDays = eachDayOfInterval({
        start: miniCalStart,
        end: addDays(miniCalStart, 41),
    });

    const slots = useMemo(() => {
        const rawSlots: CalendarSlot[] = [];
        batches.forEach((batch, bIdx) => {
            if (selectedBatchId !== 'all' && batch.id !== selectedBatchId) return;
            const subject = subjects.find((item) => item.id === batch.subject_id);
            (batch.scheduledTopics || []).forEach((slot) => {
                rawSlots.push({
                    ...slot,
                    batchId: batch.id,
                    batchName: batch.batch_name,
                    subjectName: subject?.subject_name || 'Unknown',
                    color: BATCH_COLORS[bIdx % BATCH_COLORS.length],
                    childSlots: [slot],
                });
            });
        });
        return mergeContiguousSlots(rawSlots);
    }, [batches, selectedBatchId, subjects]);

    const calendarEvents = useMemo<EventInput[]>(() => {
        return slots
            .map((slot) => {
                const slotDate = getSlotDate(slot.date);
                if (!slotDate) return null;
                return {
                    id: `${slot.batchId}-${slot.id}`,
                    title: slot.topicTitle || 'Untitled Topic',
                    start: toIsoDateTime(slotDate, slot.startTime, '09:00'),
                    end: toIsoDateTime(slotDate, slot.endTime, '10:00'),
                    backgroundColor: `${slot.color}18`,
                    borderColor: slot.color,
                    textColor: slot.color,
                    extendedProps: { slot },
                } satisfies EventInput;
            })
            .filter(Boolean) as EventInput[];
    }, [slots]);

    const syncFromCalendar = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const nextDate = api.getDate();
    setCurrentDate((prev) => (prev.getTime() === nextDate.getTime() ? prev : nextDate));
    };

    const gotoDate = (date: Date) => {
        const api = calendarRef.current?.getApi();
        if (!api) {
            setCurrentDate(date);
            return;
        }
        api.gotoDate(date);
        syncFromCalendar();
    };

    const handleToday = () => {
        const api = calendarRef.current?.getApi();
        if (!api) {
            setCurrentDate(new Date());
            return;
        }
        api.today();
        syncFromCalendar();
    };

    const handlePrevWeek = () => {
        const api = calendarRef.current?.getApi();
        if (!api) {
            setCurrentDate((prev) => subWeeks(prev, 1));
            return;
        }
        api.prev();
        syncFromCalendar();
    };

    const handleNextWeek = () => {
        const api = calendarRef.current?.getApi();
        if (!api) {
            setCurrentDate((prev) => addWeeks(prev, 1));
            return;
        }
        api.next();
        syncFromCalendar();
    };

    const renderEventContent = (arg: EventContentArg) => {
        const slot = arg.event.extendedProps.slot as CalendarSlot;
        return (
            <div
                className="edwin-event-card h-full rounded-lg border border-border bg-background flex flex-col justify-between px-3 py-2 cursor-pointer transition-all group"
                style={{ borderColor: slot.color, minHeight: '48px', margin: '2px 0', position: 'relative' }}
                onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredSlot({ slot, pos: { x: rect.right + 8, y: rect.top } });
                }}
                onMouseLeave={() => setHoveredSlot(null)}
            >
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: slot.color }} />
                    <span className="font-semibold text-[8px] text-foreground/80">{slot.batchName}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{slot.startTime || arg.timeText}</span>
                </div>
                <div className="font-semibold text-xs text-primary truncate">{slot.topicTitle || 'Untitled Topic'}</div>
                <div className="text-[10px] text-muted-foreground truncate">{slot.unitTitle || slot.subjectName}</div>
            </div>
        );
    };

    const handleEventClick = (arg: EventClickArg) => {
        const slot = arg.event.extendedProps.slot as CalendarSlot;
        setActiveSlot(slot);
    };

    const handleDatesSet = (arg: DatesSetArg) => {
        const nextDate = arg.view.currentStart;
        setCurrentDate((prev) => (prev.getTime() === nextDate.getTime() ? prev : nextDate));
    };

    const activeTopics = activeSlot
        ? Array.from(new Set((activeSlot.childSlots || [activeSlot]).map((item) => item.topicTitle).filter(Boolean)))
        : [];

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans border-t border-border">
            <div className="hidden lg:flex w-72 border-r border-border flex-col p-4 space-y-8 bg-card/30">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold tracking-tight">Calendar</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-semibold">{format(currentDate, 'MMMM yyyy')}</span>
                            <div className="flex gap-1">
                                <button className="p-1 hover:bg-accent rounded-md transition-colors" onClick={() => gotoDate(subMonths(currentDate, 1))}>
                                    <ChevronLeft size={16} />
                                </button>
                                <button className="p-1 hover:bg-accent rounded-md transition-colors" onClick={() => gotoDate(addMonths(currentDate, 1))}>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-y-1">
                            {miniCalDays.map((day, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        'text-[11px] h-8 w-8 flex items-center justify-center rounded-full cursor-pointer transition-all',
                                        !isSameMonth(day, currentDate) ? 'text-muted-foreground/30 font-light' : 'text-foreground hover:bg-accent font-medium',
                                        isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground font-bold shadow-sm' : '',
                                        isSameDay(day, currentDate) && !isSameDay(day, new Date()) ? 'border border-primary/50' : ''
                                    )}
                                    onClick={() => gotoDate(day)}
                                >
                                    {format(day, 'd')}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">MY BATCHES</span>
                    </div>
                    <div className="space-y-1.5 px-0.5">
                        {batches.map((batch, index) => (
                            <div
                                key={batch.id}
                                className={cn(
                                    'flex items-center gap-3 p-2 rounded-lg text-sm transition-colors cursor-pointer group hover:bg-accent/50',
                                    selectedBatchId === batch.id ? 'bg-accent' : ''
                                )}
                                onClick={() => setSelectedBatchId(batch.id === selectedBatchId ? 'all' : batch.id)}
                            >
                                <div className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: BATCH_COLORS[index % BATCH_COLORS.length] }} />
                                <span className="truncate flex-1 font-medium group-hover:text-foreground transition-colors">
                                    {batch.batch_name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-background">
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/10 backdrop-blur-md z-30">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 mr-2">
                            <Button variant="outline" size="sm" onClick={handleToday} className="font-semibold px-4">
                                Today
                            </Button>
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handlePrevWeek}>
                                    <ChevronLeft size={18} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handleNextWeek}>
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight min-w-[150px]">
                            {format(currentDate, 'MMMM yyyy')}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                            <SelectTrigger className="w-[200px] h-9 bg-card border-border/50">
                                <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Batches</SelectItem>
                                {batches.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                        {batch.batch_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreHorizontal size={20} />
                        </Button>
                    </div>
                </div>

                {batches.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold">No Batches Yet</h3>
                            <p className="text-sm text-muted-foreground">Create a subject and at least one batch to start scheduling.</p>
                        </div>
                    </div>
                ) : calendarEvents.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold">No Scheduled Topics</h3>
                            <p className="text-sm text-muted-foreground">Open Scheduler settings to allocate weekly slots and generate schedules.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="edwin-timegrid h-full">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[timeGridPlugin]}
                                initialView="timeGridWeek"
                                initialDate={currentDate}
                                headerToolbar={false}
                                allDaySlot={false}
                                nowIndicator={true}
                                weekends
                                stickyHeaderDates
                                expandRows
                                height="100%"
                                slotMinTime="07:00:00"
                                slotMaxTime="22:00:00"
                                slotDuration="01:00:00"
                                slotLabelInterval="01:00"
                                slotLabelFormat={{ hour: 'numeric' }}
                                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                                events={calendarEvents}
                                datesSet={handleDatesSet}
                                dayHeaderContent={(arg) => {
                                    const isToday = isSameDay(arg.date, new Date());
                                    return (
                                        <div
                                            className={
                                                `edwin-day-header text-lg font-bold px-2 py-1 transition-colors ` +
                                                (isToday ? ' text-accent-foreground rounded' : 'text-foreground')
                                            }
                                        >
                                            <span className='text-xs'>{format(arg.date, 'EEE')}</span>
                                            <span className="ml-1">{format(arg.date, 'd')}</span>
                                        </div>
                                    );
                                }}
                                eventContent={renderEventContent}
                                eventClick={() => {}}
                                eventDisplay="block"
                                eventOverlap
                                slotEventOverlap
                                slotLaneClassNames={() => 'flex items-center justify-center font-bold text-lg'}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Hover card near block, managed at parent level */}
            {hoveredSlot && (
                <div
                    className="fixed z-30 w-80 bg-background border border-border rounded-lg shadow-lg p-4 animate-fade-in"
                    style={{ left: hoveredSlot.pos.x, top: hoveredSlot.pos.y }}
                >
                    <div className="text-base font-semibold text-primary mb-1">
                        {hoveredSlot.slot.topicTitle || 'Untitled Topic'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>{hoveredSlot.slot.startTime || '09:00'} - {hoveredSlot.slot.endTime || '10:00'}</span>
                        {hoveredSlot.slot.unitTitle && (
                            <span className="ml-2">Parent: {hoveredSlot.slot.unitTitle}</span>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                        Batch: <span className="font-medium text-foreground">{hoveredSlot.slot.batchName}</span>
                        {hoveredSlot.slot.subjectName && (
                            <span className="ml-2">Subject: <span className="font-medium text-foreground">{hoveredSlot.slot.subjectName}</span></span>
                        )}
                    </div>
                    <div className="text-xs text-foreground mb-2">
                        {/* Description not available on CalendarSlot; remove this section. */}
                        No description available.
                    </div>
                    {/* No resources available. */}
                </div>
            )}
        </div>
    );
}
