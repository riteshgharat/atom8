"use client";

import { useRef, useState } from "react";
import ProcessMonitor from "@/components/ProcessMonitor";
import Header from "@/components/Header";
import SourcesPanel from "@/components/SourcesPanel";
import OutputsPanel from "@/components/OutputsPanel";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import Atom8AnimatedLogo from "@/components/Atom8AnimatedLogo";
import ShimmerButton from "@/components/ShimmerButton";

function LandingOverlay({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col"
    >
      {/* Background Animation */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
        />
      </div>

      {/* CENTER CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10">

        {/* Animated Atom8 Logo */}
        <div className="scale-75 mb-6">
          <Atom8AnimatedLogo />
        </div>

        <p className="max-w-xl text-zinc-400 text-lg mb-10">
          Visual AI-powered data extraction.
          Transform unstructured documents into structured data instantly.        </p>

        <ShimmerButton text="Try Atom8" onClick={onClose} />
      </div>

      {/* Hidden dummy elements for beam */}
      <div ref={fromRef} className="absolute top-10 left-10 w-1 h-1 opacity-0" />
      <div
        ref={toRef}
        className="absolute bottom-10 right-10 w-1 h-1 opacity-0"
      />
    </div>
  );
}

export default function Home() {
  const [showLanding, setShowLanding] = useState(true);

  return (
    <>
      {showLanding && <LandingOverlay onClose={() => setShowLanding(false)} />}
      <main className="h-screen flex flex-col bg-zinc-50 dark:bg-black font-sans overflow-hidden">
        {/* Header */}
        <Header />

        {/* Main Content - 3 Panel Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Sources */}
          <SourcesPanel />

          {/* Center - Workspace/Pipeline */}
          <div className="flex-1 overflow-hidden">
            <ProcessMonitor />
          </div>

          {/* Right Sidebar - Outputs */}
          <OutputsPanel />
        </div>
      </main>
    </>
  );
}
