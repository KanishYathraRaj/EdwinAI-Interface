'use client';

import { GcrCourse, GcrStudent, GcrCourseWork, GradeRefreshResult, Assessment } from "./types";
import { handleApiResponse } from "./utils";

const API_BASE_URL = 'http://127.0.0.1:5000';


export async function triggerGcrAuth(): Promise<any> {
    const endpoint = `${API_BASE_URL}/gcr/auth`;
    const response = await fetch(endpoint, { method: 'POST' });
    return handleApiResponse(response, endpoint);
}

export async function getGcrCourses(): Promise<GcrCourse[]> {
    const endpoint = `${API_BASE_URL}/gcr/courses`;
    const response = await fetch(endpoint);
    const data = await handleApiResponse(response, endpoint);
    return data.courses;
}

export async function getGcrStudents(courseId: string): Promise<GcrStudent[]> {
    const endpoint = `${API_BASE_URL}/gcr/courses/${courseId}/students`;
    const response = await fetch(endpoint);
    const data = await handleApiResponse(response, endpoint);
    return data.students;
}

async function fetchPdfBlob(material: any, materialType: 'documentation' | 'question_bank'): Promise<Blob> {
    let endpoint = '';
    if (materialType === 'question_bank') {
        endpoint = `${API_BASE_URL}/download_question_bank`;
    } else {
        // Assuming a similar endpoint exists for documentation, or using a generic one
        // You might need to create this endpoint in your backend
        endpoint = `${API_BASE_URL}/download_documentation`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material),
    });

    const handledResponse = await handleApiResponse(response, endpoint);
    return handledResponse.blob();
}

export async function uploadMaterialToGcr(courseId: string, material: any, materialType: 'documentation' | 'question_bank'): Promise<any> {
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
}

export async function generateGcrAssessment(payload: any): Promise<any> {
    const endpoint = `${API_BASE_URL}/generate_assessment`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleApiResponse(response, endpoint);
}

export async function getGcrCoursework(courseId: string): Promise<GcrCourseWork[]> {
    const endpoint = `${API_BASE_URL}/gcr/courses/${courseId}/coursework`;
    const response = await fetch(endpoint);
    const data = await handleApiResponse(response, endpoint);
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

    const endpoint = url.toString();
    const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    return handleApiResponse(response, endpoint);
}
