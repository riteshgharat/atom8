"use client";

import React from 'react';
import {
    FileSpreadsheet,
    FileText,
    FileArchive,
    MoreVertical,
    Download,
    Loader2,
    Clock,
    CheckCircle2,
    ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/useJobStore';

interface OutputFile {
    id: string;
    name: string;
    status: 'generating' | 'pending' | 'ready';
    estimatedTime?: string;
    type: 'csv' | 'pdf' | 'parquet' | 'json';
    data?: any;
}

const FileIcon = ({ type }: { type: string }) => {
    const iconClass = "w-5 h-5";
    switch (type) {
        case 'csv':
            return <FileSpreadsheet className={cn(iconClass, "text-green-500")} />;
        case 'pdf':
            return <FileText className={cn(iconClass, "text-red-500")} />;
        case 'parquet':
            return <FileArchive className={cn(iconClass, "text-purple-500")} />;
        case 'json':
            return <FileText className={cn(iconClass, "text-amber-500")} />;
        default:
            return <FileText className={cn(iconClass, "text-zinc-500")} />;
    }
};

const StatusBadge = ({ status, estimatedTime }: { status: string; estimatedTime?: string }) => {
    switch (status) {
        case 'generating':
            return (
                <div className="flex items-center gap-1.5 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span className="text-blue-500">Generating</span>
                    {estimatedTime && (
                        <span className="text-zinc-400">, Est. {estimatedTime}</span>
                    )}
                </div>
            );
        case 'pending':
            return (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Clock className="w-3 h-3" />
                    <span>Pending</span>
                </div>
            );
        case 'ready':
            return (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready</span>
                </div>
            );
        default:
            return null;
    }
};

export default function OutputsPanel() {
    const { status, result, sources } = useJobStore();
    const isProcessing = status === 'processing' || status === 'uploading';
    const isCompleted = status === 'completed';

    // Generate output files - only show after completion
    const generateOutputFiles = (): OutputFile[] => {
        if (isCompleted && result) {
            return [
                {
                    id: '1',
                    name: 'Structured_Output.json',
                    status: 'ready',
                    type: 'json',
                    data: result
                },
                {
                    id: '2',
                    name: 'Cleaned_Dataset.csv',
                    status: 'ready',
                    type: 'csv',
                    data: result
                },
                {
                    id: '3',
                    name: 'Processing_Report.pdf',
                    status: 'ready',
                    type: 'pdf',
                    data: result
                },
            ];
        }

        // Don't show any files until processing is complete
        return [];
    };

    const outputs = generateOutputFiles();
    const readyCount = outputs.filter(o => o.status === 'ready').length;

    const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) return '';

        let stringValue = typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

        // Escape quotes and wrap in quotes if needed
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
        }

        return stringValue;
    };

    const generatePDF = async (output: OutputFile) => {
        // Generate comprehensive Data Autopsy report using LLM and get PDF
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_BASE_URL}/generate-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(output.data),
            });

            if (!response.ok) {
                throw new Error('Report generation failed');
            }

            // Get the PDF blob directly from the response
            const pdfBlob = await response.blob();

            // Create download link
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ATOM8_Data_Autopsy_Report.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Report generation error:', error);

            // Fallback to basic text report if PDF generation fails
            const data = output.data;
            let reportContent = `ATOM8 DATA PROCESSING REPORT\n\n`;
            reportContent += `Generated: ${new Date().toLocaleString()}\n\n`;
            reportContent += `===== PROCESSING SUMMARY =====\n\n`;

            if (data && data.results) {
                const results = data.results;
                reportContent += `Total Items Processed: ${results.length}\n\n`;

                results.forEach((item: any, idx: number) => {
                    reportContent += `\n--- Item ${idx + 1} ---\n`;
                    reportContent += `Source: ${item.source || 'Unknown'}\n`;
                    reportContent += `Type: ${item.type || 'Unknown'}\n`;

                    if (item.data) {
                        reportContent += `\nExtracted Data:\n`;
                        reportContent += JSON.stringify(item.data, null, 2) + '\n';
                    }
                });
            }

            reportContent += `\n\n===== END OF REPORT =====\n`;

            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Processing_Report_Fallback.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleDownload = async (output: OutputFile) => {
        if (output.type === 'pdf') {
            generatePDF(output);
            return;
        }

        if (!output.data) return;

        let content: string;
        let mimeType: string;
        let extension: string;

        if (output.type === 'json') {
            content = JSON.stringify(output.data, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else if (output.type === 'csv') {
            // Use direct CSV conversion (ai_structurizer_to_csv)
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

                // Send raw data for direct CSV conversion
                const response = await fetch(`${API_BASE_URL}/convert-to-csv`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        raw_data: JSON.stringify(output.data, null, 2),
                        target_schema: "Extract all fields as CSV columns with proper headers",
                        is_csv_input: false
                    }),
                });

                if (!response.ok) {
                    throw new Error('CSV conversion failed');
                }

                const result = await response.json();
                content = result.csv;
            } catch (error) {
                console.error('CSV conversion error:', error);
                // Fallback to JSON if conversion fails
                content = JSON.stringify(output.data, null, 2);
            }
            mimeType = 'text/csv';
            extension = 'csv';
        } else {
            return;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = output.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAll = () => {
        outputs.filter(o => o.status === 'ready' && (o.data || o.type === 'pdf')).forEach(handleDownload);
    };

    return (
        <div className="w-72 h-full flex flex-col bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Outputs
                </h2>
            </div>

            {/* Status summary */}
            {isCompleted && (
                <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Processing Complete
                    </p>
                </div>
            )}

            {/* Output files section */}
            <div className="flex-1 overflow-y-auto">
                {outputs.length > 0 ? (
                    <>
                        <div className="px-4 py-2">
                            <span className="text-xs text-zinc-400">
                                Ready for download
                            </span>
                        </div>

                        <div className="space-y-1 px-2">
                            {outputs.map((file, index) => (
                                <motion.div
                                    key={file.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={cn(
                                        "group px-3 py-3 rounded-lg cursor-pointer transition-colors",
                                        file.status === 'ready'
                                            ? "hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                    )}
                                    onClick={() => file.status === 'ready' && handleDownload(file)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "p-1.5 rounded-lg",
                                            file.status === 'generating'
                                                ? "bg-blue-50 dark:bg-blue-900/20"
                                                : file.status === 'ready'
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                                                    : "bg-zinc-100 dark:bg-zinc-800"
                                        )}>
                                            <FileIcon type={file.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                {file.name}
                                            </p>
                                            <StatusBadge status={file.status} estimatedTime={file.estimatedTime} />
                                        </div>
                                        {file.status === 'ready' && (
                                            <Download className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
                        <div className="w-16 h-16 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <Download className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                        </div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                            No outputs yet
                        </p>
                        <p className="text-xs text-zinc-400 max-w-[200px]">
                            {isProcessing
                                ? "Processing your data... outputs will appear here when complete."
                                : "Add sources and start the pipeline to generate outputs."
                            }
                        </p>
                    </div>
                )}

                {/* Result preview */}
                {isCompleted && result && (
                    <div className="px-3 py-3 mt-2">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                                Result Preview
                            </p>
                            <pre className="text-base text-zinc-500 overflow-x-auto min-h-80 overflow-y-auto">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer - Download button */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={handleDownloadAll}
                    disabled={readyCount === 0}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                        readyCount > 0
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                    )}
                >
                    <Download className="w-4 h-4" />
                    {readyCount > 0
                        ? `Download All (${readyCount})`
                        : 'Generate & Download All'}
                </button>
            </div>
        </div>
    );
}
