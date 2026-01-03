import React from 'react';
import { cn } from '@/lib/utils';

interface RgbContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const RgbContainer = ({ children, className, ...props }: RgbContainerProps) => {
    return (
        <div className={cn("relative group rounded-2xl p-[1px] overflow-hidden", className)} {...props}>
            {/* Animated Gradient Background layer */}
            <div className="absolute inset-[-100%] animate-disco bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] opacity-70 blur-sm transition-opacity duration-500 will-change-transform" />

            {/* Inner Content with solid background */}
            <div className="relative h-full bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
                {children}
            </div>
        </div>
    );
};
