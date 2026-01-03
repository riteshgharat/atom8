"use client";

import React from "react";
import { useReactFlow } from "reactflow";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasControlsProps {
  isDraggable: boolean;
  onToggleDraggable: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function CanvasControls({
  isDraggable,
  onToggleDraggable,
  isFullscreen = false,
  onToggleFullscreen,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
      <button
        onClick={() => zoomIn({ duration: 300 })}
        className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
      </button>

      <button
        onClick={() => zoomOut({ duration: 300 })}
        className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
      </button>

      <button
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        title="Fit View"
      >
        <Maximize2 className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
      </button>

      <button
        onClick={onToggleFullscreen}
        className={cn(
          "p-2.5 border rounded-lg shadow-lg transition-colors",
          isFullscreen
            ? "bg-emerald-500 border-emerald-600 hover:bg-emerald-600"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        )}
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="w-5 h-5 text-white" />
        ) : (
          <Maximize2 className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        )}
      </button>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

      <button
        onClick={onToggleDraggable}
        className={cn(
          "p-2.5 border rounded-lg shadow-lg transition-colors",
          isDraggable
            ? "bg-blue-500 border-blue-600 hover:bg-blue-600"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        )}
        title={isDraggable ? "Lock Nodes" : "Unlock Nodes"}
      >
        {isDraggable ? (
          <Unlock className="w-5 h-5 text-white" />
        ) : (
          <Lock className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        )}
      </button>
    </div>
  );
}
