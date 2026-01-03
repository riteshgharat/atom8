"use client";

import { useJobStore } from '@/store/useJobStore';
import { useCallback, useEffect, useRef } from 'react';
import { uploadFile, uploadUrl, JobStatus } from '@/lib/api';
import { wsManager } from '@/lib/websocket';

// Map backend status to pipeline stages
const statusToStageMap: Record<string, string> = {
    'queued': 'ingestion',
    'Extracting Raw Data': 'ingestion',
    'Cleaning & Normalizing Data': 'cleaning',
    'Structuring with AI': 'normalization',
    'Validating': 'validation',
    'completed': 'export',
    'failed': 'export'
};

// Map backend status to progress
const statusToProgressMap: Record<string, number> = {
    'queued': 5,
    'Extracting Raw Data': 20,
    'Cleaning & Normalizing Data': 45,
    'Structuring with AI': 70,
    'Validating': 90,
    'completed': 100,
    'failed': 0
};

export function usePipeline() {
    const {
        sources,
        schema,
        setStatus,
        setProgress,
        setResult,
        addLog,
        setCurrentJobId,
        updateSource,
        updateStage,
        resetStages,
        stages
    } = useJobStore();

    const activeJobsRef = useRef<Set<string>>(new Set());

    // Handle WebSocket status updates
    const handleStatusUpdate = useCallback((sourceId: string, status: JobStatus) => {
        console.log('[Pipeline] Status update:', status);

        // Update progress
        const progress = statusToProgressMap[status.status] || 0;
        setProgress(progress);

        // Update source status
        if (status.status === 'completed') {
            updateSource(sourceId, { status: 'completed' });
            addLog(`✓ Processing completed successfully`);
        } else if (status.status === 'failed') {
            updateSource(sourceId, { status: 'failed', error: status.error || 'Unknown error' });
            addLog(`✗ Processing failed: ${status.error}`);
        } else {
            addLog(`→ ${status.status}`);
        }

        // Update pipeline stages based on status
        const currentStageId = statusToStageMap[status.status];
        if (currentStageId) {
            // Mark previous stages as completed
            const stageOrder = ['ingestion', 'cleaning', 'normalization', 'validation', 'export'];
            const currentIndex = stageOrder.indexOf(currentStageId);
            
            stageOrder.forEach((stageId, index) => {
                if (index < currentIndex) {
                    updateStage(stageId, { status: 'completed' });
                } else if (index === currentIndex) {
                    updateStage(stageId, { 
                        status: status.status === 'completed' ? 'completed' : 
                               status.status === 'failed' ? 'failed' : 'running' 
                    });
                }
            });
        }

        // Handle completion
        if (status.status === 'completed') {
            setStatus('completed');
            if (status.result) {
                setResult(status.result);
                addLog(`📊 Result: ${JSON.stringify(status.result).substring(0, 100)}...`);
            }
        } else if (status.status === 'failed') {
            setStatus('failed');
        }
    }, [setProgress, updateSource, addLog, updateStage, setStatus, setResult]);

    // Start the pipeline
    const startPipeline = useCallback(async () => {
        if (sources.length === 0) {
            addLog("⚠ Error: No sources added. Please add files or URLs.");
            return;
        }

        // Reset state
        resetStages();
        setStatus('uploading');
        setProgress(0);
        addLog("🚀 Starting pipeline...");

        // Process each source
        for (const source of sources) {
            try {
                updateSource(source.id, { status: 'uploading' });
                addLog(`📤 Uploading: ${source.name}`);

                let response;
                if (source.type === 'file' && source.file) {
                    response = await uploadFile(source.file, schema);
                } else if (source.type === 'url' && source.url) {
                    response = await uploadUrl(source.url, schema);
                } else {
                    throw new Error('Invalid source configuration');
                }

                const jobId = response.job_id;
                setCurrentJobId(jobId);
                updateSource(source.id, { status: 'processing', jobId });
                activeJobsRef.current.add(jobId);

                addLog(`✓ Upload complete. Job ID: ${jobId}`);
                addLog(`🔗 Connecting to WebSocket for real-time updates...`);

                // Connect to WebSocket for this job
                setStatus('processing');
                updateStage('ingestion', { status: 'running' });

                wsManager.connect(
                    jobId,
                    (status) => handleStatusUpdate(source.id, status),
                    (error) => {
                        addLog(`⚠ WebSocket error: ${error}`);
                        updateSource(source.id, { status: 'failed', error });
                    }
                );

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                addLog(`✗ Error: ${errorMessage}`);
                updateSource(source.id, { status: 'failed', error: errorMessage });
                setStatus('failed');
            }
        }
    }, [sources, schema, setStatus, setProgress, addLog, resetStages, updateSource, setCurrentJobId, updateStage, handleStatusUpdate]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsManager.disconnectAll();
            activeJobsRef.current.clear();
        };
    }, []);

    return {
        startPipeline,
        isProcessing: useJobStore.getState().status === 'processing' || useJobStore.getState().status === 'uploading'
    };
}
