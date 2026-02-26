'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GcrCourse, GcrStudent } from '@/lib/types';
import { getGcrCourses, getGcrStudents } from '@/lib/gcr';
import { useToast } from '@/hooks/use-toast';
import { GcrAuthError } from '@/lib/utils';

interface GcrContextType {
    courses: GcrCourse[];
    studentsCache: Record<string, GcrStudent[]>;
    isLoadingCourses: boolean;
    loadingStudents: Record<string, boolean>;
    fetchCourses: (force?: boolean) => Promise<void>;
    fetchStudents: (courseId: string, force?: boolean) => Promise<void>;
    isGcrAuthDone: boolean;
    setGcrAuthDone: (done: boolean) => void;
}

const GcrContext = createContext<GcrContextType | undefined>(undefined);

// Active promise references to prevent concurrent duplicate requests
let activeCoursesPromise: Promise<void> | null = null;
const activeStudentsPromises: Record<string, Promise<void>> = {};

export function GcrProvider({ children }: { children: React.ReactNode }) {
    const [courses, setCourses] = useState<GcrCourse[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('edwin_gcr_courses');
            return cached ? JSON.parse(cached) : [];
        }
        return [];
    });
    const [studentsCache, setStudentsCache] = useState<Record<string, GcrStudent[]>>({});
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState<Record<string, boolean>>({});
    const [isGcrAuthDone, setIsGcrAuthDone] = useState(false);
    const { toast } = useToast();

    // Persist courses to localStorage whenever they change
    useEffect(() => {
        if (courses.length > 0) {
            localStorage.setItem('edwin_gcr_courses', JSON.stringify(courses));
        }
    }, [courses]);

    const fetchCourses = useCallback(async (force = false) => {
        if (!force && courses.length > 0) return;
        if (activeCoursesPromise) return activeCoursesPromise;

        setIsLoadingCourses(true);
        activeCoursesPromise = (async () => {
            try {
                const data = await getGcrCourses();
                setCourses(data);
            } catch (error: any) {
                console.error('[GcrContext] Error fetching courses:', error);
                if (!(error instanceof GcrAuthError)) {
                    toast({
                        variant: "destructive",
                        title: "Failed to Fetch Courses",
                        description: error.message || "Could not fetch Google Classroom courses.",
                    });
                }
                throw error;
            } finally {
                setIsLoadingCourses(false);
                activeCoursesPromise = null;
            }
        })();

        return activeCoursesPromise;
    }, [courses.length, toast]);

    const fetchStudents = useCallback(async (courseId: string, force = false) => {
        if (!force && studentsCache[courseId]) return;
        if (activeStudentsPromises[courseId]) return activeStudentsPromises[courseId];

        setLoadingStudents(prev => ({ ...prev, [courseId]: true }));
        activeStudentsPromises[courseId] = (async () => {
            try {
                const data = await getGcrStudents(courseId);
                setStudentsCache(prev => ({ ...prev, [courseId]: data }));
            } catch (error: any) {
                console.error(`[GcrContext] Error fetching students for ${courseId}:`, error);
                if (!(error instanceof GcrAuthError)) {
                    toast({
                        variant: "destructive",
                        title: "Failed to Fetch Students",
                        description: error.message || "Could not fetch students for this course.",
                    });
                }
                throw error;
            } finally {
                setLoadingStudents(prev => ({ ...prev, [courseId]: false }));
                delete activeStudentsPromises[courseId];
            }
        })();

        return activeStudentsPromises[courseId];
    }, [studentsCache, toast]);

    return (
        <GcrContext.Provider
            value={{
                courses,
                studentsCache,
                isLoadingCourses,
                loadingStudents,
                fetchCourses,
                fetchStudents,
                isGcrAuthDone,
                setGcrAuthDone: setIsGcrAuthDone,
            }}
        >
            {children}
        </GcrContext.Provider>
    );
}

export function useGcr() {
    const context = useContext(GcrContext);
    if (context === undefined) {
        throw new Error('useGcr must be used within a GcrProvider');
    }
    return context;
}
