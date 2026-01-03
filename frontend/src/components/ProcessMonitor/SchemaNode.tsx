"use client";

import React, { memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/useJobStore';

interface SchemaNodeProps {
    data: {
        isFirst: boolean;
    };
}

const SchemaNode = memo(({ data }: SchemaNodeProps) => {
    const { schema, setSchema, status } = useJobStore();
    const isProcessing = status === 'processing' || status === 'uploading';
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-expand textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
        }
    }, [schema]);

    return (
        <>
            <div className="relative">
                <div className={cn(
                    "flex flex-col min-w-[320px] p-4 rounded-xl transition-all shadow-lg bg-white dark:bg-zinc-900 border-2 border-blue-500",
                    isProcessing && "opacity-75"
                )}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <FileEdit className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            Target Schema
                        </h3>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs text-zinc-400 mb-3">
                        Define the data structure to extract
                    </p>

                    {/* Schema Input */}
                    <textarea
                        ref={textareaRef}
                        value={schema}
                        onChange={(e) => setSchema(e.target.value)}
                        disabled={isProcessing}
                        placeholder='e.g., "Extract name, price, date Or JSON...'
                        className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 resize-none text-zinc-700 dark:text-zinc-300 overflow-hidden"
                        spellCheck={false}
                    />

                    {/* Format indicator */}
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-mono">
                            {schema.trim().startsWith('{') ? 'JSON' : 'TEXT'} format
                        </span>
                        <span className="text-[10px] text-zinc-400">
                            {schema.length} chars
                        </span>
                    </div>
                </div>
            </div>

            {/* Handle for outgoing edge */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-blue-500 border-2 border-white dark:border-zinc-900"
            />
        </>
    );
});

SchemaNode.displayName = 'SchemaNode';

export default SchemaNode;
