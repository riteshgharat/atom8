"use client";

import React from "react";
import { useJobStore } from "@/store/useJobStore";
import { Table, Download, Copy, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { RgbContainer } from "@/components/ui/RgbContainer";

export default function ResultPreview() {
  const { result, status } = useJobStore();

  // Extract actual data from nested structure
  let displayData = result;
  if (result && result.results && Array.isArray(result.results)) {
    displayData = result.results.map((item: any) => item.data).filter(Boolean);
  } else if (result && !Array.isArray(result)) {
    displayData = [result];
  }

  const headers = displayData && displayData.length > 0 ? Object.keys(displayData[0]) : [];

  return (
    <RgbContainer className="h-full">
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Table className="w-5 h-5 text-purple-500" />
            Data Preview
          </h2>
          <div className="flex gap-2">
            <button
              disabled={!displayData || displayData.length === 0}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              disabled={!displayData || displayData.length === 0}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "relative w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl flex-1",
            !result
              ? "h-64 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50"
              : ""
          )}
        >
          {!displayData || displayData.length === 0 ? (
            <div className="text-center text-zinc-400">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No data generated yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full h-full">
              <table className="w-full text-sm text-left">
                <thead className="text-sm text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 font-medium tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {displayData.map((row: any, i: number) => (
                    <tr
                      key={i}
                      className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {headers.map((h) => (
                        <td
                          key={h}
                          className="px-6 py-5 text-base font-normal text-zinc-900 dark:text-zinc-300 whitespace-nowrap"
                        >
                          {typeof row[h] === "object"
                            ? JSON.stringify(row[h])
                            : row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RgbContainer>
  );
}
