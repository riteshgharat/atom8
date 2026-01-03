"use client";

import React from 'react';
import { useJobStore, PipelineStage } from '@/store/useJobStore';
import { 
    Check, 
    Loader2, 
    Play, 
    AlertTriangle,
    Upload,
    Sparkles,
    Scale,
    ShieldCheck,
    Download,
    Pause
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePipeline } from '@/hooks/usePipeline';

const getStageIcon = (stageId: string, className: string) => {
    switch (stageId) {
        case 'ingestion':
            return <Upload className={className} />;
        case 'cleaning':
            return <Sparkles className={className} />;
        case 'normalization':
            return <Scale className={className} />;
        case 'validation':
            return <ShieldCheck className={className} />;
        case 'export':
            return <Download className={className} />;
        default:
            return <Play className={className} />;
    }
};

const StatusIcon = ({ status }: { status: PipelineStage['status'] }) => {
    switch (status) {
        case 'completed':
            return (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                </div>
            );
        case 'running':
            return (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
            );
        case 'failed':
            return (
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                </div>
            );
        case 'pending':
        default:
            return (
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-400" />
                </div>
            );
    }
};

const getStageDescription = (stageId: string, status: PipelineStage['status']) => {
    const descriptions: Record<string, { active: string; pending: string }> = {
        ingestion: { active: 'Connect & Parse', pending: 'Awaiting data' },
        cleaning: { active: 'Remove Duplicates, Handle Nulls', pending: 'Awaiting ingestion' },
        normalization: { active: 'Standardize Formats, Scale Values', pending: 'Awaiting cleaning' },
        validation: { active: 'Schema Check, Integrity Tests', pending: 'Awaiting normalization' },
        export: { active: 'Generate AI-Ready Dataset', pending: 'Awaiting validation' },
    };
    
    const desc = descriptions[stageId] || { active: 'Processing...', pending: 'Pending' };
    return status === 'pending' ? desc.pending : desc.active;
};

export default function ProcessMonitor() {
    const { stages, status, logs, progress, sources } = useJobStore();
    const { startPipeline } = usePipeline();

    const isIdle = status === 'idle';
    const canStart = isIdle && sources.length > 0;

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900/50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Workspace
                    </h2>
                    {status !== 'idle' && (
                        <span className={cn(
                            "px-2 py-0.5 text-[10px] font-medium rounded-full uppercase",
                            status === 'processing' || status === 'uploading' 
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : status === 'completed'
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                : status === 'failed'
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                : ""
                        )}>
                            {status}
                        </span>
                    )}
                </div>
                <button
                    onClick={startPipeline}
                    disabled={!canStart}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                        canStart
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    )}
                >
                    <Play className="w-4 h-4" />
                    {isIdle ? 'Start Pipeline' : 'Running...'}
                </button>
            </div>

            {/* Pipeline Title */}
            <div className="px-6 py-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    AI-Powered Data Pipeline
                </h1>
                {progress > 0 && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                            <span>Overall Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Pipeline Stages */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-x-auto">
                <div className="flex items-start gap-0">
                    {stages.map((stage, index) => (
                        <React.Fragment key={stage.id}>
                            {/* Stage Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "flex flex-col min-w-[160px] p-4 rounded-xl transition-all",
                                    stage.status === 'running' 
                                        ? "bg-white dark:bg-zinc-900 border-2 border-blue-500 shadow-lg shadow-blue-500/10" 
                                        : stage.status === 'failed'
                                        ? "bg-white dark:bg-zinc-900 border-2 border-red-500"
                                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <StatusIcon status={stage.status} />
                                </div>
                                
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                                    {stage.name}
                                </h3>
                                
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    {getStageDescription(stage.id, stage.status)}
                                </p>

                                {/* Progress bar for running stage */}
                                {stage.status === 'running' && (
                                    <div className="mt-3">
                                        <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-blue-500 rounded-full"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            {/* Arrow connector */}
                            {index < stages.length - 1 && (
                                <div className="flex items-center self-center h-full px-2">
                                    <div className={cn(
                                        "w-8 h-0.5",
                                        stage.status === 'completed'
                                            ? "bg-emerald-400"
                                            : "bg-zinc-200 dark:bg-zinc-700"
                                    )} />
                                    <div className={cn(
                                        "w-0 h-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent",
                                        stage.status === 'completed'
                                            ? "border-l-emerald-400"
                                            : "border-l-zinc-200 dark:border-l-zinc-700"
                                    )} />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Console/Logs */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-950 max-h-40 overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <span className="ml-3 text-xs text-zinc-500 font-mono">Pipeline Output</span>
                    <span className="ml-auto text-[10px] text-zinc-600">{logs.length} entries</span>
                </div>
                <div className="p-4 h-24 overflow-y-auto space-y-1 text-xs font-mono text-zinc-400">
                    {logs.length === 0 && (
                        <span className="opacity-30">Waiting for pipeline to start...</span>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                            <span className={cn(
                                log.includes('✓') ? "text-emerald-400" :
                                log.includes('✗') ? "text-red-400" :
                                log.includes('⚠') ? "text-amber-400" :
                                log.includes('🚀') ? "text-blue-400" :
                                "text-zinc-400"
                            )}>
                                {log}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
