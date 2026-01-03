"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { useJobStore } from '@/store/useJobStore';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipeline } from '@/hooks/usePipeline';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    ConnectionLineType,
    MarkerType,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

import PipelineNode from './PipelineNode';
import CanvasControls from './CanvasControls';
import { motion } from 'framer-motion';

const nodeTypes = {
    pipelineStage: PipelineNode,
};

function ProcessMonitorContent() {
    const { stages, status, logs, progress, sources } = useJobStore();
    const { startPipeline } = usePipeline();
    const [isDraggable, setIsDraggable] = useState(false);

    const isIdle = status === 'idle';
    const isCompleted = status === 'completed';
    const canStart = (isIdle || isCompleted) && sources.length > 0;

    // Convert stages to React Flow nodes
    const initialNodes: Node[] = useMemo(() => {
        return stages.map((stage, index) => ({
            id: stage.id,
            type: 'pipelineStage',
            position: { x: index * 280, y: 150 },
            data: {
                stage,
                isFirst: index === 0,
                isLast: index === stages.length - 1,
            },
            draggable: isDraggable,
        }));
    }, [stages, isDraggable]);

    // Convert stage connections to React Flow edges
    const initialEdges: Edge[] = useMemo(() => {
        return stages.slice(0, -1).map((stage, index) => {
            const nextStage = stages[index + 1];
            const isCompleted = stage.status === 'completed';
            
            return {
                id: `${stage.id}-${nextStage.id}`,
                source: stage.id,
                target: nextStage.id,
                type: ConnectionLineType.SmoothStep,
                animated: stage.status === 'running',
                style: {
                    stroke: isCompleted ? '#10b981' : '#71717a',
                    strokeWidth: 2,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isCompleted ? '#10b981' : '#71717a',
                    width: 20,
                    height: 20,
                },
            };
        });
    }, [stages]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when stages change
    React.useEffect(() => {
        setNodes(initialNodes);
    }, [initialNodes, setNodes]);

    // Update edges when stages change
    React.useEffect(() => {
        setEdges(initialEdges);
    }, [initialEdges, setEdges]);

    const toggleDraggable = useCallback(() => {
        setIsDraggable(prev => !prev);
    }, []);

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
                    {isIdle ? 'Start Pipeline' : status === 'completed' ? 'Run Again' : 'Running...'}
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

            {/* Canvas Area */}
            <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-900">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.2}
                    maxZoom={2}
                    defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background 
                        gap={16} 
                        size={1}
                        className="bg-zinc-50 dark:bg-zinc-900"
                    />
                    <MiniMap
                        className="!bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 rounded-lg"
                        nodeClassName={(node) => {
                            const stage = stages.find(s => s.id === node.id);
                            if (stage?.status === 'running') return '!fill-blue-500';
                            if (stage?.status === 'completed') return '!fill-emerald-500';
                            if (stage?.status === 'failed') return '!fill-red-500';
                            return '!fill-zinc-300 dark:!fill-zinc-700';
                        }}
                    />
                    <CanvasControls 
                        isDraggable={isDraggable}
                        onToggleDraggable={toggleDraggable}
                    />
                </ReactFlow>
            </div>

            {/* Console/Logs */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-950 max-h-60 overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <span className="ml-3 text-xs text-zinc-500 font-mono">Pipeline Output</span>
                    <span className="ml-auto text-[10px] text-zinc-600">{logs.length} entries</span>
                </div>
                <div className="p-4 h-48 overflow-y-auto space-y-1 text-xs font-mono text-zinc-400">
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

export default function ProcessMonitor() {
    return (
        <ReactFlowProvider>
            <ProcessMonitorContent />
        </ReactFlowProvider>
    );
}
