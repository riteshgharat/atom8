"use client";

import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from 'reactflow';
import {
    Check,
    Loader2,
    AlertTriangle,
    Upload,
    Sparkles,
    Scale,
    ShieldCheck,
    Download,
    Info,
    X,
    ChevronRight,
    FileText,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PipelineStage, StageData, useJobStore } from '@/store/useJobStore';

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
            return <Upload className={className} />;
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

// Stage Data Popup Modal
const StageDataModal = ({
    stage,
    stageData,
    onClose
}: {
    stage: PipelineStage;
    stageData: StageData | null;
    onClose: () => void;
}) => {
    // Use portal to render modal at document body level, escaping React Flow container
    if (typeof document === 'undefined') return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl mx-auto w-full max-w-6xl mx-8 max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn(
                    "px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between",
                    stage.status === 'completed' ? "bg-emerald-50/50 dark:bg-emerald-900/10" :
                        stage.status === 'running' ? "bg-blue-50/50 dark:bg-blue-900/10" :
                            stage.status === 'failed' ? "bg-red-50/50 dark:bg-red-900/10" :
                                "bg-zinc-50 dark:bg-zinc-800/50"
                )}>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                            stage.status === 'completed' ? "bg-emerald-500 text-white" :
                                stage.status === 'running' ? "bg-blue-500 text-white" :
                                    stage.status === 'failed' ? "bg-red-500 text-white" :
                                        "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                        )}>
                            {getStageIcon(stage.id, "w-6 h-6")}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight uppercase">
                                {stage.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    stage.status === 'completed' ? "bg-emerald-500 animate-pulse" :
                                        stage.status === 'running' ? "bg-blue-500 animate-spin" :
                                            stage.status === 'failed' ? "bg-red-500" : "bg-zinc-400"
                                )} />
                                <p className="text-sm font-medium text-zinc-500 capitalize">
                                    {stageData?.status || stage.status}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all group"
                    >
                        <X className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                    {/* Input Section */}
                    {stageData?.input && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                                        Input Data
                                    </h3>
                                </div>
                                <span className="text-xs font-mono px-3 py-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold">
                                    {stageData.input.length.toLocaleString()} characters
                                </span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                                <pre className="text-base font-mono text-zinc-700 dark:text-zinc-400 whitespace-pre-wrap overflow-x-auto max-h-[350px] overflow-y-auto leading-relaxed">
                                    {stageData.input}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Transition Animation */}
                    {stageData?.input && stageData?.output && (
                        <div className="flex items-center justify-center gap-8 py-4 opacity-50">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
                            <div className="flex items-center gap-3 text-zinc-400">
                                <ChevronRight className="w-5 h-5" />
                                <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-900/20">
                                    <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                                </div>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
                        </div>
                    )}

                    {/* Output Section */}
                    {stageData?.output && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                                        Processed Output
                                    </h3>
                                </div>
                                <span className="text-xs font-mono px-3 py-1.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {stageData.output.length.toLocaleString()} characters
                                </span>
                            </div>
                            <div className="bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-900/30 shadow-inner">
                                <pre className="text-base font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto max-h-[450px] overflow-y-auto leading-relaxed">
                                    {stageData.output}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Stats Section */}
                    {stageData?.stats && Object.keys(stageData.stats).length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                                    <Info className="w-4 h-4 text-purple-500" />
                                </div>
                                <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                                    Stage Intelligence & Stats
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(stageData.stats).map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="bg-white dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors group"
                                    >
                                        <p className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-2 group-hover:text-purple-400 transition-colors">
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <div className="text-lg font-bold text-zinc-900 dark:text-white truncate">
                                            {typeof value === 'object' ?
                                                <span className="text-xs font-mono">{JSON.stringify(value)}</span> :
                                                String(value)
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No data message */}
                    {!stageData && (
                        <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                            <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Info className="w-8 h-8 text-zinc-300" />
                            </div>
                            <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Awaiting Execution</h4>
                            <p className="text-sm text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
                                No processing details available yet. Start the pipeline to capture telemetry.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-zinc-950/10 dark:shadow-white/5"
                    >
                        Close Portal
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

interface PipelineNodeProps {
    data: {
        stage: PipelineStage;
        isFirst: boolean;
        isLast: boolean;
    };
}

const PipelineNode = memo(({ data }: PipelineNodeProps) => {
    const { stage, isFirst, isLast } = data;
    const [showTooltip, setShowTooltip] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const stageData = useJobStore((state) => state.stageData[stage.id]);

    // Determine tooltip content
    const hasInfo = stage.message || stage.error || stage.status !== 'pending';
    const tooltipContent = stage.error || stage.message || getStageDescription(stage.id, stage.status);

    const handleNodeClick = () => {
        setShowModal(true);
        setShowTooltip(false);
    };

    return (
        <>
            {/* Handle for incoming edge */}
            {!isFirst && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="w-3 h-3 !bg-zinc-400 border-2 border-white dark:border-zinc-900"
                />
            )}

            <div className="relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={handleNodeClick}
                    className={cn(
                        "flex flex-col min-w-[200px] p-4 rounded-xl transition-all shadow-lg cursor-pointer",
                        stage.status === 'running'
                            ? "bg-white dark:bg-zinc-900 border-2 border-blue-500 shadow-blue-500/20"
                            : stage.status === 'failed'
                                ? "bg-white dark:bg-zinc-900 border-2 border-red-500"
                                : stage.status === 'completed'
                                    ? "bg-white dark:bg-zinc-900 border-2 border-emerald-500"
                                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                        "hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    )}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <StatusIcon status={stage.status} />
                        {(hasInfo || stageData) && (
                            <Info className="w-4 h-4 text-zinc-400 ml-auto" />
                        )}
                    </div>

                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                        {stage.name}
                    </h3>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                        {getStageDescription(stage.id, stage.status)}
                    </p>

                    {/* Click hint */}
                    {(stage.status === 'completed' || stageData) && (
                        <p className="text-[10px] text-blue-500 mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Click to view data
                        </p>
                    )}

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

                {/* Tooltip */}
                {showTooltip && hasInfo && !showModal && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg shadow-lg z-50 max-w-xs whitespace-normal text-xs",
                            stage.error
                                ? "bg-red-500 text-white"
                                : stage.status === 'completed'
                                    ? "bg-emerald-500 text-white"
                                    : stage.status === 'running'
                                        ? "bg-blue-500 text-white"
                                        : "bg-zinc-900 text-white"
                        )}
                    >
                        {tooltipContent}
                        {/* Arrow */}
                        <div className={cn(
                            "absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4",
                            stage.error
                                ? "border-t-red-500"
                                : stage.status === 'completed'
                                    ? "border-t-emerald-500"
                                    : stage.status === 'running'
                                        ? "border-t-blue-500"
                                        : "border-t-zinc-900"
                        )} />
                    </motion.div>
                )}
            </div>

            {/* Handle for outgoing edge */}
            {!isLast && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="w-3 h-3 !bg-zinc-400 border-2 border-white dark:border-zinc-900"
                />
            )}

            {/* Stage Data Modal */}
            <AnimatePresence>
                {showModal && (
                    <StageDataModal
                        stage={stage}
                        stageData={stageData}
                        onClose={() => setShowModal(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
});

PipelineNode.displayName = 'PipelineNode';

export default PipelineNode;
