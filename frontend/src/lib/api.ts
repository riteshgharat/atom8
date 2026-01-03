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
 * Upload multiple sources (files and URLs) together in a single request
 * This ensures proper merging of multiple data sources
 */
export async function uploadMultipleSources(
    sources: SourceItem[],
    schema: string,
    onSourceUpdate: (sourceId: string, updates: Partial<SourceItem>) => void
): Promise<string[]> {
    
    if (sources.length === 0) {
        throw new Error('No sources to upload');
    }

    try {
        // Update all sources to uploading state
        sources.forEach(source => {
            onSourceUpdate(source.id, { status: 'uploading' });
        });

        const formData = new FormData();
        formData.append('target_schema', schema);

        let fileCount = 0;
        let urlCount = 0;

        // Add all files to formData (can append multiple with same key)
        for (const source of sources) {
            if (source.type === 'file' && source.file) {
                console.log(`[Frontend] Adding file: ${source.file.name} (${source.file.size} bytes, type: ${source.file.type})`);
                formData.append('files', source.file);
                fileCount++;
            }
        }

        // Add all URLs to formData (each as separate field)
        for (const source of sources) {
            if (source.type === 'url' && source.url) {
                console.log(`[Frontend] Adding URL: ${source.url}`);
                formData.append('urls', source.url);
                urlCount++;
            }
        }

        console.log(`[Frontend] Uploading ${fileCount} file(s) and ${urlCount} URL(s) together...`);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Upload failed: ${error}`);
        }

        const data: UploadResponse = await response.json();
        const jobId = data.job_id;

        // Update all sources with the same job ID
        sources.forEach(source => {
            onSourceUpdate(source.id, {
                status: 'processing',
                jobId: jobId
            });
        });

        console.log(`[Frontend] ✓ All sources uploaded together with job ID: ${jobId}`);
        return [jobId];

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Frontend] ✗ Upload failed: ${errorMessage}`);
        
        // Update all sources with error
        sources.forEach(source => {
            onSourceUpdate(source.id, {
                status: 'failed',
                error: errorMessage
            });
        });

        throw error;
    }
}

/**
 * Get the WebSocket URL for a job
 */
export function getWebSocketUrl(jobId: string): string {
    const wsBase = API_BASE_URL.replace('http', 'ws');
    return `${wsBase}/ws/${jobId}`;
}

export { API_BASE_URL };