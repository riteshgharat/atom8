import { create } from 'zustand';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface SourceItem {
    id: string;
    type: 'file' | 'url';
    name: string;
    size?: string;
    file?: File;
    url?: string;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    jobId?: string;
    error?: string;
}

export interface PipelineStage {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    message?: string;  // Status message for tooltip
    error?: string;    // Error message if failed
}

export interface StageData {
    status: 'running' | 'completed' | 'failed';
    input?: string;
    output?: string;
    stats?: Record<string, any>;
}

interface JobState {
    // Sources (files and URLs)
    sources: SourceItem[];
    
    // Current job tracking
    currentJobId: string | null;
    status: JobStatus;
    progress: number;
    
    // Schema
    schema: string;
    
    // Pipeline stages
    stages: PipelineStage[];
    stageData: Record<string, StageData>;  // Stage-wise data previews
    
    // Results
    result: any | null;
    logs: string[];
    
    // Legacy support
    file: File | null;
    steps: { name: string; status: 'pending' | 'current' | 'completed' }[];

    // Source actions
    addFile: (file: File) => void;
    addFiles: (files: File[]) => void;
    addUrl: (url: string) => void;
    removeSource: (id: string) => void;
    updateSource: (id: string, updates: Partial<SourceItem>) => void;
    clearSources: () => void;
    
    // Schema actions
    setSchema: (schema: string) => void;
    
    // Job actions
    setCurrentJobId: (id: string | null) => void;
    setStatus: (status: JobStatus) => void;
    setProgress: (progress: number) => void;
    
    // Pipeline stage actions
    updateStage: (stageId: string, updates: Partial<PipelineStage>) => void;
    resetStages: () => void;
    setStageData: (stageData: Record<string, StageData>) => void;
    
    // Result actions
    setResult: (result: any) => void;
    addLog: (log: string) => void;
    
    // Legacy actions
    setFile: (file: File | null) => void;
    setJobId: (id: string) => void;
    updateStep: (index: number, status: 'pending' | 'current' | 'completed') => void;

    // Reset
    reset: () => void;
    resetForNewRun: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultStages: PipelineStage[] = [
    { id: 'ingestion', name: 'INGESTION', status: 'pending' },
    { id: 'cleaning', name: 'CLEANING', status: 'pending' },
    { id: 'normalization', name: 'NORMALIZATION', status: 'pending' },
    { id: 'validation', name: 'VALIDATION', status: 'pending' },
    { id: 'export', name: 'EXPORT', status: 'pending' },
];

const defaultSteps = [
    { name: 'Upload Document', status: 'pending' as const },
    { name: 'Analyze Schema', status: 'pending' as const },
    { name: 'Extract Data', status: 'pending' as const },
    { name: 'Validate Output', status: 'pending' as const },
];

export const useJobStore = create<JobState>((set, get) => ({
    sources: [],
    currentJobId: null,
    status: 'idle',
    progress: 0,
    schema: "",
    stages: [...defaultStages],
    stageData: {},
    result: null,
    logs: [],
    file: null,
    steps: [...defaultSteps],

    // Source actions
    addFile: (file) => set((state) => ({
        sources: [...state.sources, {
            id: generateId(),
            type: 'file',
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
            file,
            status: 'pending'
        }],
        file: file // Legacy support
    })),

    addFiles: (files) => set((state) => ({
        sources: [...state.sources, ...files.map(file => ({
            id: generateId(),
            type: 'file' as const,
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
            file,
            status: 'pending' as const
        }))],
        file: files[0] || state.file // Legacy support - use first file
    })),

    addUrl: (url) => set((state) => {
        // Extract domain or use full URL as name
        let name = url;
        try {
            const urlObj = new URL(url);
            name = urlObj.hostname + urlObj.pathname;
        } catch {}
        
        return {
            sources: [...state.sources, {
                id: generateId(),
                type: 'url',
                name,
                url,
                status: 'pending'
            }]
        };
    }),

    removeSource: (id) => set((state) => ({
        sources: state.sources.filter(s => s.id !== id),
        file: state.sources.find(s => s.id === id)?.file === state.file ? null : state.file
    })),

    updateSource: (id, updates) => set((state) => ({
        sources: state.sources.map(s => 
            s.id === id ? { ...s, ...updates } : s
        )
    })),

    clearSources: () => set({ sources: [], file: null }),

    // Schema actions
    setSchema: (schema) => set({ schema }),

    // Job actions
    setCurrentJobId: (currentJobId) => set({ currentJobId }),
    setStatus: (status) => set({ status }),
    setProgress: (progress) => set({ progress }),

    // Pipeline stage actions
    updateStage: (stageId, updates) => set((state) => ({
        stages: state.stages.map(stage =>
            stage.id === stageId ? { ...stage, ...updates } : stage
        )
    })),

    resetStages: () => set({ stages: [...defaultStages], stageData: {} }),

    setStageData: (stageData) => set({ stageData }),

    // Result actions
    setResult: (result) => set({ result }),
    addLog: (log) => set((state) => ({ 
        logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${log}`] 
    })),

    // Legacy actions
    setFile: (file) => set((state) => {
        if (file) {
            // Also add to sources if not already there
            const existingSource = state.sources.find(s => s.file === file);
            if (!existingSource) {
                return { 
                    file,
                    sources: [...state.sources, {
                        id: generateId(),
                        type: 'file',
                        name: file.name,
                        size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
                        file,
                        status: 'pending'
                    }]
                };
            }
        }
        return { file };
    }),
    
    setJobId: (id) => set({ currentJobId: id }),
    
    updateStep: (index, status) => set((state) => {
        const newSteps = [...state.steps];
        if (newSteps[index]) {
            newSteps[index].status = status;
        }
        return { steps: newSteps };
    }),

    // Reset
    reset: () => set({
        sources: [],
        currentJobId: null,
        status: 'idle',
        progress: 0,
        stages: [...defaultStages],
        result: null,
        logs: [],
        file: null,
        steps: [...defaultSteps]
    }),

    // Reset for new run (keeps sources, clears job state)
    resetForNewRun: () => set({
        currentJobId: null,
        status: 'idle',
        progress: 0,
        stages: [...defaultStages],
        stageData: {},
        result: null,
        logs: [],
        steps: [...defaultSteps]
    }),
}));
