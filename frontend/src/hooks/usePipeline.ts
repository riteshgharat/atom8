import { useJobStore } from '@/store/useJobStore';
import { useEffect, useCallback } from 'react';

export function usePipeline() {
    const {
        file,
        schema,
        setStatus,
        setProgress,
        updateStep,
        setResult,
        addLog,
        jobId,
        setJobId
    } = useJobStore();

    const startPipeline = useCallback(async () => {
        if (!file) {
            addLog("Error: No file selected.");
            return;
        }

        setJobId(Math.random().toString(36).substring(7));
        setStatus('uploading');
        addLog("Starting upload...");
        updateStep(0, 'current');

        // Simulate Upload
        await new Promise(r => setTimeout(r, 1500));
        updateStep(0, 'completed');
        addLog("Upload complete.");

        // Simulate Processing
        setStatus('processing');
        updateStep(1, 'current');
        addLog("Analyzing schema...");
        await new Promise(r => setTimeout(r, 1000));
        updateStep(1, 'completed');

        updateStep(2, 'current');
        addLog("Extracting data...");

        // Simulate Progress
        for (let i = 0; i <= 100; i += 10) {
            setProgress(i);
            await new Promise(r => setTimeout(r, 200));
        }

        updateStep(2, 'completed');

        // Validate
        updateStep(3, 'current');
        addLog("Validating results...");
        await new Promise(r => setTimeout(r, 800));
        updateStep(3, 'completed');

        // Finish
        const mockResult = [
            { id: 1, ...JSON.parse(schema).fields.reduce((acc: any, f: any) => ({ ...acc, [f.name]: "Sample " + f.name }), {}) },
            { id: 2, ...JSON.parse(schema).fields.reduce((acc: any, f: any) => ({ ...acc, [f.name]: "Sample 2 " + f.name }), {}) },
        ];
        setResult(mockResult);
        setStatus('completed');
        addLog("Pipeline completed successfully.");

    }, [file, schema, setStatus, setProgress, updateStep, setResult, addLog, setJobId]);

    return {
        startPipeline
    };
}
