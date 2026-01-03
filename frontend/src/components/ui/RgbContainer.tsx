"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RgbContainerProps {
    children: React.ReactNode;
    className?: string;
}

export const RgbContainer = ({ children, className }: RgbContainerProps) => {
    return (
        <div
            className={cn(
                "relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden",
                className
            )}
        >
            {/* Simple RGB line at top for the 'RGB' effect */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-red-500 via-green-500 to-blue-500 opacity-80" />
            {children}
        </div>
    );
};
