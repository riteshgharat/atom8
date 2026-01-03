"use client";

import { useJobStore } from '@/store/useJobStore';
import { useCallback, useEffect, useRef } from 'react';
import { uploadMultipleSources, JobStatus } from '@/lib/api';
import { wsManager } from '@/lib/websocket';

// Map backend status to pipeline stages
const statusToStageMap: Record<string, string> = {
    'queued': 'ingestion',
    'Extracting Raw Data': 'ingestion',
    'Cleaning & Normalizing Data': 'cleaning',
    'Structuring with AI': 'normalization',
    'Validating': 'validation',
    'Exporting Results': 'export',
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
    'Exporting Results': 95,
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
        resetForNewRun,
        setStageData,
        stages
    } = useJobStore();

    const activeJobsRef = useRef<Set<string>>(new Set());

    // Handle WebSocket status updates
    const handleStatusUpdate = useCallback((sourceId: string, status: JobStatus) => {
        console.log('[Pipeline] Status update:', status);

        // Update progress
        const progress = statusToProgressMap[status.status] || 0;
        setProgress(progress);

        // Update stage data from backend
        if (status.stage_data) {
            setStageData(status.stage_data);
        }

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
                    updateStage(stageId, { 
                        status: 'completed',
                        message: 'Stage completed successfully'
                    });
                } else if (index === currentIndex) {
                    if (status.status === 'completed') {
                        updateStage(stageId, { 
                            status: 'completed',
                            message: 'All processing complete'
                        });
                        addLog(`✓ ${stageOrder[index].toUpperCase()}: Completed`);
                    } else if (status.status === 'failed') {
                        updateStage(stageId, { 
                            status: 'failed',
                            error: status.error || 'Processing failed',
                            message: 'Error occurred'
                        });
                        addLog(`✗ ${stageOrder[index].toUpperCase()}: Failed - ${status.error}`);
                    } else {
                        // Running state
                        let message = '';
                        switch (stageId) {
                            case 'ingestion':
                                message = 'Extracting and parsing data...';
                                break;
                            case 'cleaning':
                                message = 'Removing duplicates and handling nulls...';
                                break;
                            case 'normalization':
                                message = 'Structuring data with AI...';
                                break;
                            case 'validation':
                                message = 'Running integrity checks...';
                                break;
                            case 'export':
                                message = 'Generating final outputs...';
                                break;
                        }
                        updateStage(stageId, { 
                            status: 'running',
                            message
                        });
                        addLog(`▶ ${stageOrder[index].toUpperCase()}: ${message}`);
                    }
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
    }, [setProgress, setStageData, updateSource, addLog, updateStage, setStatus, setResult]);

    // Start the pipeline
    const startPipeline = useCallback(async () => {
        if (sources.length === 0) {
            addLog("⚠ Error: No sources added. Please add files or URLs.");
            return;
        }

        // Reset state for new run (keeps sources)
        resetForNewRun();
        setStatus('uploading');
        setProgress(0);
        addLog("🚀 Starting pipeline...");
        addLog(`📁 Processing ${sources.length} source(s) together...`);

        try {
            // Update all sources to uploading state
            sources.forEach(source => {
                updateSource(source.id, { status: 'uploading' });
            });

            // Upload all sources together in ONE request
            console.log('[Pipeline] Uploading all sources together:', sources.map(s => s.name));
            const jobIds = await uploadMultipleSources(
                sources,
                schema,
                (sourceId, updates) => {
                    updateSource(sourceId, updates);
                }
            );

            if (jobIds.length === 0) {
                throw new Error('No job ID returned from upload');
            }

            const jobId = jobIds[0]; // Single job for all sources merged together
            setCurrentJobId(jobId);
            activeJobsRef.current.add(jobId);

            addLog(`✓ All sources uploaded together successfully!`);
            addLog(`📊 Merging ${sources.length} source(s)...`);
            addLog(`🔗 Connecting to WebSocket for real-time updates...`);

            // Connect to WebSocket for this single job
            setStatus('processing');
            updateStage('ingestion', { status: 'running' });

            wsManager.connect(
                jobId,
                (status) => handleStatusUpdate('merged_sources', status),
                (error) => {
                    addLog(`⚠ WebSocket error: ${error}`);
                    sources.forEach(source => {
                        updateSource(source.id, { status: 'failed', error });
                    });
                    setStatus('failed');
                }
            );

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addLog(`✗ Error: ${errorMessage}`);
            sources.forEach(source => {
                updateSource(source.id, { status: 'failed', error: errorMessage });
            });
            setStatus('failed');
        }
    }, [sources, schema, setStatus, setProgress, addLog, resetForNewRun, updateSource, setCurrentJobId, updateStage, handleStatusUpdate]);

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
