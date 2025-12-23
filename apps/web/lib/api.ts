const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://api:3001";
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || PUBLIC_API_URL;
// Use internal host for SSR (inside the container) and public host for the browser.
const API_URL =
  typeof window === "undefined" ? INTERNAL_API_URL : PUBLIC_API_URL;

type RequestOptions = {
  headers?: Record<string, string>;
};

export const api = {
  /**
   * GET request wrapper
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const res = await fetch(`${API_URL}/${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    return handleResponse<T>(res);
  },

  /**
   * POST request wrapper
   */
  async post<T>(
    endpoint: string,
    body: any,
    options?: RequestOptions
  ): Promise<T> {
    const res = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });

    return handleResponse<T>(res);
  },

  /**
   * Specialized wrapper for File Uploads (Multipart Form Data)
   * Note: We do NOT set Content-Type header here; the browser sets it with the boundary automatically.
   */
  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      body: formData,
      // No headers needed for FormData
    });

    return handleResponse<T>(res);
  },
};

/**
 * Standardized error handling helper
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `API Error: ${res.statusText}`;
    try {
      // Try to parse the backend error message if it exists
      const errorBody = await res.json();
      if (errorBody.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Ignore JSON parse error and use status text
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content)
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}
