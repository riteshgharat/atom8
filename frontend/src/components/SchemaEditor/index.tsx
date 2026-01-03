"use client";

import React from 'react';
import { useJobStore } from '@/store/useJobStore';
import { Database, Save } from 'lucide-react';
import { RgbContainer } from '@/components/ui/RgbContainer';

export default function SchemaEditor() {
    const { schema, setSchema, status } = useJobStore();

    return (
        <RgbContainer className="h-full">
            <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-500" />
                        Output Schema
                    </h2>
                    <span className="text-xs font-mono px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">JSON</span>
                </div>

                <div className="relative flex-1">
                    <textarea
                        value={schema}
                        onChange={(e) => setSchema(e.target.value)}
                        disabled={status !== 'idle'}
                        className="w-full h-full min-h-[200px] p-4 font-mono text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none text-zinc-700 dark:text-zinc-300 transition-all placeholder:text-zinc-400"
                        spellCheck={false}
                    />
                    <div className="absolute bottom-4 right-4">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                            <Save className="w-3.5 h-3.5" />
                            Save Preset
                        </button>
                    </div>
                </div>
            </div>
        </RgbContainer>
    );
}
