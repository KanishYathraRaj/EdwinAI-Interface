'use client';

import { GcrCourse, GcrStudent } from "./types";

const API_BASE_URL = 'http://127.0.0.1:5000/gcr';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API call failed with no error details.' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function triggerGcrAuth(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth`, { method: 'POST' });
    return handleResponse(response);
}

export async function getGcrCourses(): Promise<GcrCourse[]> {
    const response = await fetch(`${API_BASE_URL}/courses`);
    const data = await handleResponse(response);
    return data.courses;
}

export async function getGcrStudents(courseId: string): Promise<GcrStudent[]> {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/students`);
    const data = await handleResponse(response);
    return data.students;
}

export async function uploadMaterialToGcr(courseId: string, material: any): Promise<any> {
    // This is a simplified version. The backend expects a file.
    // We will convert the JSON material to a Blob, then a File.
    const materialBlob = new Blob([JSON.stringify(material, null, 2)], { type: 'application/pdf' });
    const materialFile = new File([materialBlob], `${material.course_title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', materialFile);
    formData.append('title', material.course_title);

    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/materials/upload`, {
        method: 'POST',
        body: formData,
    });
    return handleResponse(response);
}
