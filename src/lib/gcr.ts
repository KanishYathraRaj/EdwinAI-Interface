'use client';

import { GcrCourse, GcrStudent, GcrCourseWork, GradeRefreshResult, Assessment } from "./types";
import { handleApiResponse, GcrAuthError } from "./utils";

const API_BASE_URL = 'http://127.0.0.1:5005';


export async function triggerGcrAuth(): Promise<any> {
    const endpoint = `${API_BASE_URL}/gcr/auth`;
    try {
        const response = await fetch(endpoint, { method: 'POST' });
        const data = await handleApiResponse(response, endpoint);
        if (data.auth_url) {
            console.log('[GCR AUTH] Auth URL received, opening new tab:', data.auth_url);
            window.open(data.auth_url, '_blank');
        }
        return data;
    } catch (error: any) {
        if (error instanceof GcrAuthError && error.authUrl) {
            console.log('[GCR AUTH] Auth URL received via error, opening new tab:', error.authUrl);
            window.open(error.authUrl, '_blank');
        }
        throw error;
    }
}

/**
 * Wrapper to automatically retry a GCR API call if it fails due to auth.
 */
async function withGcrAuthRetry<T>(fn: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (error instanceof GcrAuthError && retryCount < 1) {
            console.log(`[GCR API] Auth error detected (retry ${retryCount + 1})...`);

            // If the error itself has an authUrl, open it immediately
            if (error.authUrl) {
                console.log('[GCR API] Auth URL present in error, opening tab:', error.authUrl);
                window.open(error.authUrl, '_blank');
            }

            try {
                // Also trigger the general auth endpoint which might do more (like resetting backend state)
                await triggerGcrAuth();

                // Wait a bit for the user to potentially authorize? 
                // Actually, triggerGcrAuth will return as soon as it gets the URL.
                // We should probably wait or just let it fail and tell the user to retry.
                // For now, retry once after triggering.
                return await fn();
            } catch (authError) {
                console.error('[GCR API] Re-auth flow initiated but failed:', authError);
                throw error; // Throw original auth error
            }
        }
        throw error;
    }
}

export async function getGcrCourses(): Promise<GcrCourse[]> {
    return withGcrAuthRetry(async () => {
        const endpoint = `${API_BASE_URL}/gcr/courses`;
        const response = await fetch(endpoint);
        const data = await handleApiResponse(response, endpoint);
        return data.courses;
    });
}

export async function getGcrStudents(courseId: string): Promise<GcrStudent[]> {
    return withGcrAuthRetry(async () => {
        const endpoint = `${API_BASE_URL}/gcr/courses/${courseId}/students`;
        const response = await fetch(endpoint);
        const data = await handleApiResponse(response, endpoint);
        return data.students;
    });
}

async function fetchPdfBlob(material: any, materialType: 'documentation' | 'question_bank'): Promise<Blob> {
    let endpoint = '';
    if (materialType === 'question_bank') {
        endpoint = `${API_BASE_URL}/download_question_bank`;
    } else {
        endpoint = `${API_BASE_URL}/download_documentation`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material),
    });

    // Use raw response.blob() — do NOT pass through handleApiResponse,
    // which would consume the response body as text/JSON first.
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PDF download failed (${response.status}): ${errorText}`);
    }
    return response.blob();
}

export async function uploadMaterialToGcr(courseId: string, material: any, materialType: 'documentation' | 'question_bank'): Promise<any> {
    return withGcrAuthRetry(async () => {
        const pdfBlob = await fetchPdfBlob(material, materialType);

        const materialFile = new File([pdfBlob], `${material.course_title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('file', materialFile);
        formData.append('title', material.course_title);

        const endpoint = `${API_BASE_URL}/gcr/courses/${courseId}/materials/upload`;
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
        });

        return handleApiResponse(response, endpoint);
    });
}

export async function generateGcrAssessment(payload: any): Promise<any> {
    return withGcrAuthRetry(async () => {
        const endpoint = `${API_BASE_URL}/generate_assessment`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return handleApiResponse(response, endpoint);
    });
}

export async function getGcrCoursework(courseId: string): Promise<GcrCourseWork[]> {
    return withGcrAuthRetry(async () => {
        const endpoint = `${API_BASE_URL}/gcr/courses/${courseId}/coursework`;
        const response = await fetch(endpoint);
        const data = await handleApiResponse(response, endpoint);
        return data.coursework;
    });
}


export async function refreshGcrGrades(assessment: Assessment, userId: string, subjectId: string): Promise<GradeRefreshResult> {
    return withGcrAuthRetry(async () => {
        if (!assessment.course_id || !assessment.coursework_id) {
            throw new Error("Missing course_id or coursework_id in assessment data.");
        }

        const url = new URL(`${API_BASE_URL}/gcr/courses/${assessment.course_id}/coursework/${assessment.coursework_id}/grades`);
        url.searchParams.append('user_id', userId);
        url.searchParams.append('subject_id', subjectId);
        url.searchParams.append('push_to_classroom', 'true');

        const endpoint = url.toString();
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        return handleApiResponse(response, endpoint);
    });
}

export async function publishToGcr(courseId: string, title: string, content: string): Promise<any> {
    return withGcrAuthRetry(async () => {
        const endpoint = `${API_BASE_URL}/gcr/courses/${courseId}/publish`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content }),
        });

        return handleApiResponse(response, endpoint);
    });
}
