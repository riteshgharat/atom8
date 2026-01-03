"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useJobStore } from "@/store/useJobStore";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipeline } from "@/hooks/usePipeline";
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
} from "reactflow";
import "reactflow/dist/style.css";

import PipelineNode from "./PipelineNode";
import SchemaNode from "./SchemaNode";
import CanvasControls from "./CanvasControls";
import { motion } from "framer-motion";

const nodeTypes = {
    pipelineStage: PipelineNode,
    schemaNode: SchemaNode,
};

function ProcessMonitorContent() {
    const { stages, status, logs, progress, sources } = useJobStore();
    const { startPipeline } = usePipeline();
    const [isDraggable, setIsDraggable] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isIdle = status === "idle";
    const isCompleted = status === "completed";
    const canStart = (isIdle || isCompleted) && sources.length > 0;

    // Convert stages to React Flow nodes
    const initialNodes: Node[] = useMemo(() => {
        // Schema node as first node (moved left to avoid overlap)
        const schemaNode: Node = {
            id: "schema",
            type: "schemaNode",
            position: { x: -50, y: 150 },  // Start slightly left
            data: {
                isFirst: true,
            },
            draggable: isDraggable,
        };

        // Pipeline stages start after schema with increased spacing
        const stageNodes = stages.map((stage, index) => ({
            id: stage.id,
            type: "pipelineStage",
            position: { x: 350 + (index * 250), y: 150 },  // Start at 350px, then 250px spacing
            data: {
                stage,
                isFirst: false,
                isLast: index === stages.length - 1,
            },
            draggable: isDraggable,
        }));

        return [schemaNode, ...stageNodes];
    }, [stages, isDraggable]);

    // Convert stage connections to React Flow edges
    const initialEdges: Edge[] = useMemo(() => {
        // Edge from schema to first pipeline stage
        const schemaEdge: Edge = {
            id: "schema-ingestion",
            source: "schema",
            target: stages[0]?.id || "ingestion",
            type: ConnectionLineType.SmoothStep,
            animated: false,
            style: {
                stroke: "#3b82f6",
                strokeWidth: 2,
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#3b82f6",
                width: 20,
                height: 20,
            },
        };

        // Edges between pipeline stages
        const stageEdges = stages.slice(0, -1).map((stage, index) => {
            const nextStage = stages[index + 1];
            const isCompleted = stage.status === "completed";

            return {
                id: `${stage.id}-${nextStage.id}`,
                source: stage.id,
                target: nextStage.id,
                type: ConnectionLineType.SmoothStep,
                animated: stage.status === "running",
                style: {
                    stroke: isCompleted ? "#10b981" : "#71717a",
                    strokeWidth: 2,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isCompleted ? "#10b981" : "#71717a",
                    width: 20,
                    height: 20,
                },
            };
        });

        return [schemaEdge, ...stageEdges];
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
        setIsDraggable((prev) => !prev);
    }, []);

    return (
        <div
            className={cn(
                "h-full flex flex-col bg-zinc-50 dark:bg-zinc-900/50",
                isFullscreen && "fixed inset-0 z-50"
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
                    isFullscreen && "hidden"
                )}
            >
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        AI-Powered Data Pipeline
                    </h2>
                    {status !== "idle" && (
                        <span
                            className={cn(
                                "px-2 py-0.5 text-[10px] font-medium rounded-full uppercase",
                                status === "processing" || status === "uploading"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    : status === "completed"
                                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                        : status === "failed"
                                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                            : ""
                            )}
                        >
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
                    {isIdle
                        ? "Start Pipeline"
                        : status === "completed"
                            ? "Run Again"
                            : "Running..."}
                </button>
            </div>

            {/* Pipeline Title */}
            <div
                className={cn(
                    "px-6 py-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800",
                    isFullscreen && "hidden"
                )}
            >
                {progress > 0 && (
                    <div>
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
            <div
                className={cn(
                    "flex-1 relative bg-zinc-50 dark:bg-zinc-900",
                    isFullscreen && "fixed inset-0"
                )}
            >
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
                            const stage = stages.find((s) => s.id === node.id);
                            if (stage?.status === "running") return "!fill-blue-500";
                            if (stage?.status === "completed") return "!fill-emerald-500";
                            if (stage?.status === "failed") return "!fill-red-500";
                            return "!fill-zinc-300 dark:!fill-zinc-700";
                        }}
                    />
                    <CanvasControls
                        isDraggable={isDraggable}
                        onToggleDraggable={toggleDraggable}
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                    />
                </ReactFlow>
            </div>

            {/* Console/Logs */}
            <div
                className={cn(
                    "border-t border-zinc-200 dark:border-zinc-800 bg-zinc-950 max-h-60 overflow-hidden",
                    isFullscreen && "hidden"
                )}
            >
                <div className="flex items-center px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <span className="ml-3 text-xs text-zinc-500 font-mono">
                        Pipeline Output
                    </span>
                    <span className="ml-auto text-[10px] text-zinc-600">
                        {logs.length} entries
                    </span>
                </div>
                <div className="p-4 h-48 overflow-y-auto space-y-1 text-xs font-mono text-zinc-400">
                    {logs.length === 0 && (
                        <span className="opacity-30">Waiting for pipeline to start...</span>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                            <span
                                className={cn(
                                    log.includes("✓")
                                        ? "text-emerald-400"
                                        : log.includes("✗")
                                            ? "text-red-400"
                                            : log.includes("⚠")
                                                ? "text-amber-400"
                                                : log.includes("🚀")
                                                    ? "text-blue-400"
                                                    : "text-zinc-400"
                                )}
                            >
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
