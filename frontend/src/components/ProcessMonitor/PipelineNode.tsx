"use client";

import React, { memo, useState } from 'react';
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
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn(
                    "px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between",
                    stage.status === 'completed' ? "bg-emerald-50 dark:bg-emerald-900/20" :
                    stage.status === 'running' ? "bg-blue-50 dark:bg-blue-900/20" :
                    stage.status === 'failed' ? "bg-red-50 dark:bg-red-900/20" :
                    "bg-zinc-50 dark:bg-zinc-800"
                )}>
                    <div className="flex items-center gap-3">
                        {getStageIcon(stage.id, "w-6 h-6 text-zinc-600 dark:text-zinc-300")}
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white uppercase">
                                {stage.name}
                            </h2>
                            <p className="text-xs text-zinc-500">
                                {stageData?.status === 'completed' ? 'Completed' : 
                                 stageData?.status === 'running' ? 'Running...' : 
                                 stageData?.status === 'failed' ? 'Failed' : 'Pending'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                    {/* Input Section */}
                    {stageData?.input && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
                                    Input Data
                                </h3>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                                <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                                    {stageData.input}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Arrow */}
                    {stageData?.input && stageData?.output && (
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <ChevronRight className="w-4 h-4" />
                                <Zap className="w-4 h-4 text-amber-500" />
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    )}

                    {/* Output Section */}
                    {stageData?.output && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
                                    Output Data
                                </h3>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                                <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                                    {stageData.output}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Stats Section */}
                    {stageData?.stats && Object.keys(stageData.stats).length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-4 h-4 text-purple-500" />
                                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
                                    Stage Statistics
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(stageData.stats).map(([key, value]) => (
                                    <div 
                                        key={key}
                                        className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700"
                                    >
                                        <p className="text-[10px] uppercase text-zinc-500 mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No data message */}
                    {!stageData && (
                        <div className="text-center py-8 text-zinc-400">
                            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No data available for this stage yet.</p>
                            <p className="text-xs mt-1">Run the pipeline to see stage data.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                        onClick={onClose}
                        className="w-full py-2 px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
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
