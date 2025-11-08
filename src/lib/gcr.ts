'use client';

import { GcrCourse, GcrStudent } from "./types";

const API_BASE_URL = 'http://127.0.0.1:5000';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API call failed with no error details.' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    // For file downloads, we handle the blob directly in the calling function
    if (response.headers.get('Content-Type')?.includes('application/pdf')) {
        return response;
    }
    return response.json();
}

export async function triggerGcrAuth(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/gcr/auth`, { method: 'POST' });
    return handleResponse(response);
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
    // This endpoint should return a PDF blob
    const downloadUrl = `${API_BASE_URL}/download_question_bank`; // Assuming one endpoint for now
    
    // In a real app you might have different endpoints for different material types
    // const downloadUrl = materialType === 'documentation' 
    //   ? `${API_BASE_URL}/download_documentation`
    //   : `${API_BASE_URL}/download_question_bank`;

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
    // 1. Fetch the formatted PDF from the backend first
    const pdfBlob = await fetchPdfBlob(material, materialType);
    
    // 2. Create a File object from the blob
    const materialFile = new File([pdfBlob], `${material.course_title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
    
    // 3. Upload the actual PDF file to GCR
    const formData = new FormData();
    formData.append('file', materialFile);
    formData.append('title', material.course_title);

    const response = await fetch(`${API_BASE_URL}/gcr/courses/${courseId}/materials/upload`, {
        method: 'POST',
        body: formData,
    });
    
    return handleResponse(response);
}
