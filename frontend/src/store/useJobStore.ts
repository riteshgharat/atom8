import { create } from 'zustand';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface JobState {
    jobId: string | null;
    status: JobStatus;
    file: File | null;
    schema: string; // JSON string for simplicity in editor
    progress: number;
    steps: { name: string; status: 'pending' | 'current' | 'completed' }[];
    result: any | null;
    logs: string[];

    setFile: (file: File | null) => void;
    setSchema: (schema: string) => void;
    setJobId: (id: string) => void;
    setStatus: (status: JobStatus) => void;
    setProgress: (progress: number) => void;
    updateStep: (index: number, status: 'pending' | 'current' | 'completed') => void;
    setResult: (result: any) => void;
    addLog: (log: string) => void;
    reset: () => void;
}

export const useJobStore = create<JobState>((set) => ({
    jobId: null,
    status: 'idle',
    file: null,
    schema: JSON.stringify({
        fields: [
            { name: "name", type: "string" },
            { name: "total", type: "number" }
        ]
    }, null, 2),
    progress: 0,
    steps: [
        { name: 'Upload Document', status: 'pending' },
        { name: 'Analyze Schema', status: 'pending' },
        { name: 'Extract Data', status: 'pending' },
        { name: 'Validate Output', status: 'pending' },
    ],
    result: null,
    logs: [],

    setFile: (file) => set({ file }),
    setSchema: (schema) => set({ schema }),
    setJobId: (jobId) => set({ jobId }),
    setStatus: (status) => set({ status }),
    setProgress: (progress) => set({ progress }),
    updateStep: (index, status) => set((state) => {
        const newSteps = [...state.steps];
        if (newSteps[index]) {
            newSteps[index].status = status;
        }
        return { steps: newSteps };
    }),
    setResult: (result) => set({ result }),
    addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
    reset: () => set({
        jobId: null,
        status: 'idle',
        file: null,
        progress: 0,
        result: null,
        logs: [],
        steps: [
            { name: 'Upload Document', status: 'pending' },
            { name: 'Analyze Schema', status: 'pending' },
            { name: 'Extract Data', status: 'pending' },
            { name: 'Validate Output', status: 'pending' },
        ]
    }),
}));
