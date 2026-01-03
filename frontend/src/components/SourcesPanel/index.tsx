"use client";

import React, { useCallback, useState } from 'react';
import { useJobStore, SourceItem } from '@/store/useJobStore';
import { 
    Upload, 
    FileText, 
    FileSpreadsheet, 
    FileJson, 
    MoreVertical, 
    X,
    CheckCircle2,
    Link,
    Plus,
    Loader2,
    AlertCircle,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const FileIcon = ({ name }: { name: string }) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const iconClass = "w-5 h-5";
    
    switch (ext) {
        case 'csv':
            return <FileSpreadsheet className={cn(iconClass, "text-blue-500")} />;
        case 'json':
            return <FileJson className={cn(iconClass, "text-amber-500")} />;
        case 'xlsx':
        case 'xls':
            return <FileSpreadsheet className={cn(iconClass, "text-green-500")} />;
        case 'pdf':
            return <FileText className={cn(iconClass, "text-red-500")} />;
        default:
            return <FileText className={cn(iconClass, "text-zinc-500")} />;
    }
};

const SourceIcon = ({ source }: { source: SourceItem }) => {
    if (source.type === 'url') {
        return <Globe className="w-5 h-5 text-purple-500" />;
    }
    return <FileIcon name={source.name} />;
};

const StatusIndicator = ({ status }: { status: SourceItem['status'] }) => {
    switch (status) {
        case 'uploading':
            return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
        case 'processing':
            return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
        case 'completed':
            return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        case 'failed':
            return <AlertCircle className="w-4 h-4 text-red-500" />;
        default:
            return null;
    }
};

export default function SourcesPanel() {
    const { sources, addFiles, addUrl, removeSource, status, schema, setSchema } = useJobStore();
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    
    const isProcessing = status === 'processing' || status === 'uploading';

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (isProcessing) return;
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            addFiles(files);
        }
    }, [addFiles, isProcessing]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
        }
    };

    const handleAddUrl = () => {
        if (urlInput.trim()) {
            // Basic URL validation
            try {
                new URL(urlInput);
                addUrl(urlInput.trim());
                setUrlInput('');
                setShowUrlInput(false);
            } catch {
                // Try adding http if missing
                try {
                    new URL(`https://${urlInput}`);
                    addUrl(`https://${urlInput.trim()}`);
                    setUrlInput('');
                    setShowUrlInput(false);
                } catch {
                    alert('Please enter a valid URL');
                }
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddUrl();
        } else if (e.key === 'Escape') {
            setShowUrlInput(false);
            setUrlInput('');
        }
    };

    const readyCount = sources.filter(s => s.status === 'pending' || s.status === 'completed').length;

    return (
        <div className="w-64 h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Sources
                </h2>
            </div>

            {/* Source type tabs */}
            <div className="flex gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <button 
                    onClick={() => setShowUrlInput(false)}
                    className={cn(
                        "cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                        !showUrlInput 
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                >
                    <Upload className="w-3.5 h-3.5" />
                    Files
                </button>
                <button 
                    onClick={() => setShowUrlInput(true)}
                    className={cn(
                        "cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                        showUrlInput 
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                >
                    <Link className="w-3.5 h-3.5" />
                    URL
                </button>
            </div>

            {/* Content area */}
            <div className="flex-1">
                {/* URL Input */}
                <AnimatePresence>
                    {showUrlInput && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-3 py-3 border-b border-zinc-100 dark:border-zinc-800/50"
                        >
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    required
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter URL..."
                                    disabled={isProcessing}
                                    className="w-48 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                                />
                                <button
                                    onClick={handleAddUrl}
                                    disabled={!urlInput.trim() || isProcessing}
                                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Uploaded files section */}
                <div className="px-4 py-2">
                    <span className="text-xs text-zinc-400">
                        {sources.length > 0 ? `${sources.length} source${sources.length > 1 ? 's' : ''} added` : 'No sources added'}
                    </span>
                </div>

                {/* Sources list */}
                <div className="space-y-1 px-2">
                    <AnimatePresence>
                        {sources.map((source, index) => (
                            <motion.div
                                key={source.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ delay: index * 0.05 }}
                                className="group flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors"
                            >
                                <div className={cn(
                                    "p-1.5 rounded-lg",
                                    source.status === 'processing' ? "bg-amber-50 dark:bg-amber-900/20" :
                                    source.status === 'completed' ? "bg-emerald-50 dark:bg-emerald-900/20" :
                                    source.status === 'failed' ? "bg-red-50 dark:bg-red-900/20" :
                                    "bg-zinc-100 dark:bg-zinc-800"
                                )}>
                                    <SourceIcon source={source} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {source.name}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {source.type === 'file' ? source.size : 'Web URL'}
                                        {source.status !== 'pending' && ` • ${source.status}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <StatusIndicator status={source.status} />
                                    {!isProcessing && (
                                        <button 
                                            onClick={() => removeSource(source.id)}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all"
                                        >
                                            <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Drop zone for files */}
                {!showUrlInput && (
                    <div className="px-3 py-4">
                        <label
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className={cn(
                                "flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                                isProcessing 
                                    ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 cursor-not-allowed opacity-50"
                                    : "border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 bg-zinc-50/50 dark:bg-zinc-900/30"
                            )}
                        >
                            <Upload className="w-6 h-6 mb-2 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-xs text-zinc-400 text-center">
                                Drop files here or click to browse
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1">
                                PDF, CSV, JSON, XLSX, Images
                            </p>
                            <input 
                                type="file" 
                                className="hidden" 
                                onChange={handleFileChange} 
                                disabled={isProcessing}
                                multiple
                                accept=".pdf,.csv,.json,.xlsx,.xls,.jpg,.jpeg,.png,.tiff,.txt,.html"
                            />
                        </label>
                    </div>
                )}
            </div>

            {/* Schema Input */}
            <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Target Schema
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">JSON/TXT</span>
                </div>
                <textarea
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                    disabled={isProcessing}
                    placeholder='e.g., "Extract name, price, date"'
                    className="w-full h-44 px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 resize-none text-zinc-700 dark:text-zinc-300"
                    spellCheck={false}
                />
            </div>

            {/* Footer - Progress indicator */}
            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: sources.length > 0 ? `${(readyCount / sources.length) * 100}%` : '0%' }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                    {sources.length > 0 ? (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                            {readyCount}/{sources.length} Sources Ready
                        </>
                    ) : (
                        <span className="text-zinc-400">Add sources to begin</span>
                    )}
                </p>
            </div>
        </div>
    );
}
