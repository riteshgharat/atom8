"use client";

import React from 'react';
import { useJobStore } from '@/store/useJobStore';
import { Activity, Check, Circle, Loader2, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePipeline } from '@/hooks/usePipeline';
import { RgbContainer } from '@/components/ui/RgbContainer';

export default function ProcessMonitor() {
    const { steps, progress, status, logs } = useJobStore();
    const { startPipeline } = usePipeline();

    const isRunning = status === 'processing' || status === 'uploading';
    const isCompleted = status === 'completed';

    return (
        <RgbContainer>
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-amber-500" />
                        Live Monitor
                    </h2>
                    {status === 'idle' && (
                        <button
                            onClick={startPipeline}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                            <Play className="w-4 h-4" />
                            Start Job
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Stepper */}
                    <div className="relative flex justify-between">
                        {steps.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center relative z-10 w-full">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        scale: step.status === 'current' ? 1.1 : 1,
                                        backgroundColor: step.status === 'completed' ? '#10b981' : step.status === 'current' ? '#f59e0b' : '#e4e4e7'
                                    }}
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                                        step.status === 'completed' ? "border-emerald-500 text-white" :
                                            step.status === 'current' ? "border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                    )}
                                >
                                    {step.status === 'completed' ? <Check className="w-4 h-4" /> :
                                        step.status === 'current' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                            <span className="text-xs">{idx + 1}</span>}
                                </motion.div>
                                <span className={cn(
                                    "mt-2 text-xs font-medium transition-colors duration-300 text-center",
                                    step.status === 'current' ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                                )}>{step.name}</span>

                                {/* Line connector */}
                                {idx !== steps.length - 1 && (
                                    <div className="absolute top-4 left-1/2 w-full h-[2px] bg-zinc-100 dark:bg-zinc-800 -z-10">
                                        <motion.div
                                            className="h-full bg-emerald-500 origin-left"
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: step.status === 'completed' ? 1 : 0 }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Console/Logs */}
                    <div className="mt-6 bg-zinc-950 rounded-xl overflow-hidden font-mono text-xs border border-zinc-800">
                        <div className="flex items-center px-4 py-2 border-b border-zinc-900 bg-zinc-900/50">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                            </div>
                            <span className="ml-3 text-zinc-500">Pipeline Output</span>
                        </div>
                        <div className="p-4 h-32 overflow-y-auto space-y-1 text-zinc-400">
                            {logs.length === 0 && <span className="opacity-30">Waiting for job to start...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </RgbContainer>
    );
}
