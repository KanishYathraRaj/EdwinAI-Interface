import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Thrown when the backend returns INVALID_GRANT (expired/missing OAuth token).
 * Callers should catch this and trigger the GCR re-auth flow.
 */
export class GcrAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GcrAuthError';
  }
}

export async function handleApiResponse(response: Response, endpoint: string) {
  console.log(`[API CALL] Endpoint: ${endpoint}, Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: { error?: string; code?: string; hint?: string };
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { error: errorText || 'API call failed with no error details.' };
    }
    console.error(`[API ERROR] Endpoint: ${endpoint}, Status: ${response.status}`, errorData);

    // Surface OAuth/GCR token errors as a distinct error type so callers
    // can auto-trigger re-auth instead of only showing a toast.
    if (response.status === 401 || errorData.code === 'INVALID_GRANT') {
      throw new GcrAuthError(
        errorData.hint ||
        errorData.error ||
        'Google OAuth token is missing or expired. Please re-authenticate.'
      );
    }

    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('Content-Type');

  if (contentType?.includes('application/pdf')) {
    console.log(`[API SUCCESS] Endpoint: ${endpoint}, Status: ${response.status}, Response: PDF Blob`);
    return response;
  }

  if (contentType?.includes('application/json')) {
    const data = await response.json();
    console.log(`[API SUCCESS] Endpoint: ${endpoint}, Status: ${response.status}, Response JSON:`, data);
    return data;
  }

  const textData = await response.text();
  console.log(`[API SUCCESS] Endpoint: ${endpoint}, Status: ${response.status}, Response Text:`, textData);
  return textData;
}
