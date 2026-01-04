"use client";

import React, { useRef } from "react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { User, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export function BeamDemo() {
    const containerRef = useRef<HTMLDivElement>(null);
    const fromRef = useRef<HTMLDivElement>(null);
    const toRef = useRef<HTMLDivElement>(null);

    return (
        <div
            className="relative flex h-[200px] w-full items-center justify-center overflow-hidden rounded-lg border bg-background p-10 md:shadow-xl"
            ref={containerRef}
        >
            <div className="flex w-full max-w-lg flex-row items-center justify-between">
                <div
                    ref={fromRef}
                    className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] dark:bg-black"
                >
                    <User className="text-black dark:text-white" />
                </div>
                <div
                    ref={toRef}
                    className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] dark:bg-black"
                >
                    <Server className="text-black dark:text-white" />
                </div>
            </div>

            <AnimatedBeam
                containerRef={containerRef}
                fromRef={fromRef}
                toRef={toRef}
                startXOffset={20}
                endXOffset={20}
                curvature={-20}
            />
        </div>
    );
}