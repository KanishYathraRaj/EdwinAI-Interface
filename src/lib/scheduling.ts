import { Syllabus, Batch, DailyAvailability, ScheduledSlot, SyllabusUnit } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface SchedulerOptions {
    startDate: string;
    endDate: string;
    availability: DailyAvailability[];
    previousSchedule?: ScheduledSlot[];
    otherSchedules?: ScheduledSlot[]; // Schedules from other subjects for conflict detection
}

export interface SchedulerStrategy {
    generate(syllabus: Syllabus, options: SchedulerOptions): ScheduledSlot[];
}

export class SequentialScheduler implements SchedulerStrategy {
    generate(syllabus: Syllabus, options: SchedulerOptions): ScheduledSlot[] {
        const { startDate, endDate, availability, previousSchedule = [], otherSchedules = [] } = options;
        const toMinutes = (time: string) => {
            const [h, m] = (time || '00:00').split(':').map(Number);
            return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
        };
        const toHHMM = (minutes: number) => {
            const safe = Math.max(0, Math.floor(minutes));
            const h = Math.floor(safe / 60);
            const m = safe % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        const toLocalDateString = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        // 1. Extract all topics from syllabus in order
        const allTopics: { title: string; unitTitle: string; estimatedMinutes: number }[] = [];
        syllabus.units?.forEach((unit: SyllabusUnit) => {
            unit.topics.forEach((topic: any) => {
                const topicTitle = topic.title || topic.topic_title || 'Untitled Topic';
                const estimatedMinutes = Math.max(15, Number(topic.estimated_minutes || topic.duration_minutes || 60));
                allTopics.push({ title: topicTitle, unitTitle: unit.unit_title, estimatedMinutes });
            });
        });

        // 2. Identify already completed topics to skip them
        const completedTopicIndexes = new Set(
            previousSchedule
                .filter((s) => s.status === 'completed')
                .map((s) => s.orderIndex)
        );
        const completedTopicsCount = completedTopicIndexes.size;
        const remainingTopics = allTopics.slice(completedTopicsCount);

        if (remainingTopics.length === 0) return previousSchedule.filter(s => s.status === 'completed');

        const newSchedule: ScheduledSlot[] = [
            ...previousSchedule.filter(s => s.status === 'completed' || s.status === 'missed')
        ];

        // Maintain a map for quick availability lookup
        // Teacher's availability determines which days and times are possible
        const availabilityMap = new Map<number, DailyAvailability>();
        availability.forEach(a => availabilityMap.set(a.dayOfWeek, a));

        let currentTopicIndex = 0;
        const scheduledMinutesByOrder = new Map<number, number>();
        const start = new Date(startDate);
        const end = new Date(endDate);

        const curr = new Date(start);

        while (curr <= end && currentTopicIndex < remainingTopics.length) {
            const dayOfWeek = curr.getDay();
            const dayAvailability = availabilityMap.get(dayOfWeek);
            const dateStr = toLocalDateString(curr);

            if (dayAvailability && dayAvailability.slots && dayAvailability.slots.length > 0) {
                for (const slot of dayAvailability.slots) {
                    if (currentTopicIndex >= remainingTopics.length) break;

                    // Check for conflicts with other subjects
                    const proposedStart = toMinutes(slot.startTime);
                    const proposedEnd = toMinutes(slot.endTime);
                    const hasConflict = otherSchedules.some(s => {
                        if (s.date !== dateStr || s.status === 'cancelled') return false;
                        const otherStart = toMinutes(s.startTime || '00:00');
                        const otherEnd = toMinutes(s.endTime || s.startTime || '00:00');
                        // Interval overlap: [a,b) intersects [c,d)
                        return proposedStart < otherEnd && otherStart < proposedEnd;
                    });

                    if (hasConflict) {
                        console.log(`[Scheduler] Conflict found on ${dateStr} at ${slot.startTime}, skipping...`);
                        continue;
                    }

                    const slotStart = toMinutes(slot.startTime);
                    const slotEnd = toMinutes(slot.endTime);
                    if (slotEnd <= slotStart) continue;

                    let slotCursor = slotStart;
                    while (slotCursor < slotEnd && currentTopicIndex < remainingTopics.length) {
                        const topic = remainingTopics[currentTopicIndex];
                        const orderIndex = completedTopicsCount + currentTopicIndex;
                        const alreadyScheduledForTopic = scheduledMinutesByOrder.get(orderIndex) || 0;
                        const topicRemaining = Math.max(15, topic.estimatedMinutes) - alreadyScheduledForTopic;

                        if (topicRemaining <= 0) {
                            currentTopicIndex++;
                            continue;
                        }

                        const chunk = Math.min(topicRemaining, slotEnd - slotCursor);
                        const chunkStart = slotCursor;
                        const chunkEnd = slotCursor + chunk;

                        newSchedule.push({
                            id: uuidv4(),
                            topicTitle: topic.title,
                            unitTitle: topic.unitTitle,
                            date: dateStr,
                            startTime: toHHMM(chunkStart),
                            endTime: toHHMM(chunkEnd),
                            durationInMinutes: chunk,
                            status: 'scheduled',
                            orderIndex
                        });
                        scheduledMinutesByOrder.set(orderIndex, alreadyScheduledForTopic + chunk);

                        slotCursor = chunkEnd;
                        if (chunk >= topicRemaining) {
                            currentTopicIndex++;
                        }
                    }
                }
            }

            // Move to next day
            curr.setDate(curr.getDate() + 1);
        }

        return newSchedule;
    }
}

/**
 * Reschedules remaining topics from a specific date forward.
 */
export function rescheduleFromDate(batch: Batch, syllabus: Syllabus, fromDate: string, allOtherScheduledSlots: ScheduledSlot[] = [], teacherAvailability?: DailyAvailability[]): ScheduledSlot[] {
    const availability = (batch.availability && batch.availability.length > 0)
        ? batch.availability
        : teacherAvailability;

    if (!syllabus || !batch.startDate || !batch.endDate || !availability) {
        return batch.scheduledTopics || [];
    }

    // 1. Keep all slots that were completed or missed BEFORE the fromDate
    const preservedSchedule = (batch.scheduledTopics || []).filter(slot => {
        return slot.date < fromDate && (slot.status === 'completed' || slot.status === 'missed');
    });

    // 2. Re-run scheduler for the remaining topics starting from fromDate
    const scheduler = new SequentialScheduler();
    return scheduler.generate(syllabus, {
        startDate: fromDate,
        endDate: batch.endDate,
        availability: availability,
        previousSchedule: preservedSchedule,
        otherSchedules: allOtherScheduledSlots
    });
}
