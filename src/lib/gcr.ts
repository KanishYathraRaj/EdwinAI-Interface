'use client';

import { GcrCourse, GcrStudent, GcrCourseWork, GradeRefreshResult, Assessment } from "./types";

const API_BASE_URL = '/api';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API call failed with no error details.' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    if (response.headers.get('Content-Type')?.includes('application/pdf')) {
        return response;
    }
    return response.json();
}

export async function getGcrCourses(): Promise<GcrCourse[]> {
    const response = await fetch(`${API_BASE_URL}/gcr/courses`);
    const data = await handleResponse(response);
    return data.courses;
}

export async function getGcrStudents(courseId: string): Promise<GcrStudent[]> {
    const response = await fetch(`${API_BASE_URL}/gcr/courses/${courseId}/students`);
    const data = await handleResponse(response);
    return data.students;
}

async function fetchPdfBlob(material: any, materialType: 'documentation' | 'question_bank'): Promise<Blob> {
    let downloadUrl = '';
    if (materialType === 'question_bank') {
        downloadUrl = `${API_BASE_URL}/download_question_bank`;
    } else {
        // Assuming a similar endpoint exists for documentation, or using a generic one
        // You might need to create this endpoint in your backend
        downloadUrl = `${API_BASE_URL}/download_documentation`;
    }

    const response = await fetch(downloadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material),
    });

    if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }

    return response.blob();
}

export async function uploadMaterialToGcr(courseId: string, material: any, materialType: 'documentation' | 'question_bank'): Promise<any> {
    const pdfBlob = await fetchPdfBlob(material, materialType);
    
    const materialFile = new File([pdfBlob], `${material.course_title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', materialFile);
    formData.append('title', material.course_title);

    const response = await fetch(`${API_BASE_URL}/gcr/courses/${courseId}/materials/upload`, {
        method: 'POST',
        body: formData,
    });
    
    return handleResponse(response);
}

export async function generateGcrAssessment(payload: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/generate_assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

export async function getGcrCoursework(courseId: string): Promise<Assessment[]> {
    // This endpoint might not exist, but assuming it does for listing assessments
    const response = await fetch(`${API_BASE_URL}/gcr/courses/${courseId}/coursework`);
    const data = await handleResponse(response);
    // You might need to filter or map this data to your Assessment type
    return data.coursework;
}


export async function refreshGcrGrades(assessment: Assessment, userId: string, subjectId: string): Promise<GradeRefreshResult> {
    if (!assessment.course_id || !assessment.coursework_id) {
        throw new Error("Missing course_id or coursework_id in assessment data.");
    }
    
    const url = new URL(`${API_BASE_URL}/gcr/courses/${assessment.course_id}/coursework/${assessment.coursework_id}/grades`);
    url.searchParams.append('user_id', userId);
    url.searchParams.append('subject_id', subjectId);
    url.searchParams.append('push_to_classroom', 'true');

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    return handleResponse(response);
}
