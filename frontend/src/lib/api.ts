// API Service for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface UploadResponse {
    job_id: string;
    message: string;
}

export interface JobStatus {
    status: string;
    progress: number;
    result: any | null;
    error: string | null;
    stage_data?: Record<string, any>;
}

/**
 * Upload a single file to the backend for processing
 */
export async function uploadFile(
    file: File,
    schema: string
): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('source_type', 'file');
    formData.append('files', file);
    formData.append('target_schema', schema);

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
    }

    return response.json();
}

/**
 * Upload a URL for web scraping and processing
 */
export async function uploadUrl(
    url: string,
    schema: string
): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('source_type', 'web');
    formData.append('urls', url);
    formData.append('target_schema', schema);

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`URL upload failed: ${error}`);
    }

    return response.json();
}

export interface SourceItem {
    id: string;
    type: 'file' | 'url';
    name: string;
    file?: File;
    url?: string;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    jobId?: string;
    error?: string;
}

/**
 * Process multiple sources (files and URLs)
 * Returns an array of job IDs for each source
 */
export async function uploadMultipleSources(
    sources: SourceItem[],
    schema: string,
    onSourceUpdate: (sourceId: string, updates: Partial<SourceItem>) => void
): Promise<string[]> {
    const jobIds: string[] = [];

    for (const source of sources) {
        try {
            onSourceUpdate(source.id, { status: 'uploading' });

            let response: UploadResponse;

            if (source.type === 'file' && source.file) {
                response = await uploadFile(source.file, schema);
            } else if (source.type === 'url' && source.url) {
                response = await uploadUrl(source.url, schema);
            } else {
                throw new Error(`Invalid source: ${source.name}`);
            }

            jobIds.push(response.job_id);
            onSourceUpdate(source.id, {
                status: 'processing',
                jobId: response.job_id
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            onSourceUpdate(source.id, {
                status: 'failed',
                error: errorMessage
            });
        }
    }

    return jobIds;
}

/**
 * Get the WebSocket URL for a job
 */
export function getWebSocketUrl(jobId: string): string {
    const wsBase = API_BASE_URL.replace('http', 'ws');
    return `${wsBase}/ws/${jobId}`;
}

export { API_BASE_URL };