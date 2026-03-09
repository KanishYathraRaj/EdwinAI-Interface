# EdwinAI Calendar Dashboard: Core Logic & Code Flow

## 1. Imports & Setup
```tsx
import React, { useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import { Batch, ScheduledSlot, Subject } from '@/types/database';
import { addDays, addMonths, addWeeks, eachDayOfInterval, format, isSameDay, isSameMonth, isValid, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock3, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
```

## 2. Types & Constants
```tsx
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
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];
```

## 3. Utility Functions
```tsx
function parseClockMinutes(value?: string, fallback: string = '09:00') { /* ... */ }
function getSlotDate(rawDate: unknown) { /* ... */ }
function toIsoDateTime(date: Date, time?: string, fallback: string = '09:00') { /* ... */ }
function mergeContiguousSlots(slots: CalendarSlot[]) { /* ... */ }
```

## 4. Main Component State & Memo
```tsx
export function GlobalWeeklyCalendar({ subjects, batches }: GlobalWeeklyCalendarProps) {
    const calendarRef = useRef<FullCalendar | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
    const [activeSlot, setActiveSlot] = useState<CalendarSlot | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<{ slot: CalendarSlot; pos: { x: number; y: number } } | null>(null);

    const miniCalStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const miniCalDays = eachDayOfInterval({ start: miniCalStart, end: addDays(miniCalStart, 41) });

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
```

## 5. Calendar Navigation & Sync
```tsx
    const syncFromCalendar = () => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        const nextDate = api.getDate();
        setCurrentDate((prev) => (prev.getTime() === nextDate.getTime() ? prev : nextDate));
    };

    const gotoDate = (date: Date) => { /* ... */ };
    const handleToday = () => { /* ... */ };
    const handlePrevWeek = () => { /* ... */ };
    const handleNextWeek = () => { /* ... */ };
```

## 6. Event Rendering Logic
```tsx
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
```

## 7. Main Render & UI Structure
```tsx
    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans border-t border-border">
            <div className="hidden lg:flex w-72 border-r border-border flex-col p-4 space-y-8 bg-card/30">
                {/* Sidebar: Mini Calendar, Batch List */}
                {/* ...existing code... */}
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Top Bar: Navigation, Batch Selector */}
                {/* ...existing code... */}

                {/* Main Calendar: FullCalendar */}
                {/* ...existing code... */}
            </div>

            {/* Hover Card: Topic Details */}
            {hoveredSlot && (
                <div
                    className="fixed z-30 w-80 bg-background border border-border rounded-lg shadow-lg p-4 animate-fade-in"
                    style={{ left: hoveredSlot.pos.x, top: hoveredSlot.pos.y }}
                >
                    {/* ...existing code... */}
                </div>
            )}
        </div>
    );
}
```

## 8. FullCalendar Integration & Customization
```tsx
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
    dayHeaderContent={/* custom header logic */}
    eventContent={renderEventContent}
    eventClick={() => {}}
    eventDisplay="block"
    eventOverlap
    slotEventOverlap
    slotLaneClassNames={() => 'flex items-center justify-center font-bold text-lg'}
/>
```

---

This file captures the core logic, flows, and important code blocks of the calendar dashboard. For a full report, expand each section with explanations, diagrams, and additional context as needed. This structure is suitable for a 5-10 page technical report.
