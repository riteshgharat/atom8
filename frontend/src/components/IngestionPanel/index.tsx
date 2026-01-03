"use client";

import React, { useCallback } from 'react';
import { RgbContainer } from '@/components/ui/RgbContainer';
import { useJobStore } from '@/store/useJobStore';
import { Upload, File as FileIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function IngestionPanel() {
    const { file, setFile, status } = useJobStore();

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (status !== 'idle') return;
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) setFile(droppedFile);
    }, [setFile, status]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <RgbContainer className="h-full">
            <div className="p-6 h-full">

                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-500" />
                    Ingestion Source
                </h2>

                {!file ? (
                    <label
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                            "border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-zinc-50 dark:bg-zinc-900/50"
                        )}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 h-10 mb-3 text-zinc-400" />
                            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium">Click to upload or drag and drop</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">PDF, JPG, PNG, HTML</p>
                        </div>
                        <input type="file" className="hidden" onChange={handleChange} disabled={status !== 'idle'} />
                    </label>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-indigo-950 rounded-lg shadow-sm">
                                <FileIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
                                <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        {status === 'idle' && (
                            <button
                                onClick={() => setFile(null)}
                                className="p-1 hover:bg-white/50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-500 hover:text-red-500" />
                            </button>
                        )}
                    </motion.div>
                )}
            </div>
        </RgbContainer>
    );
}
