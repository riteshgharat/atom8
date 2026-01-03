import ProcessMonitor from "@/components/ProcessMonitor";
import Header from "@/components/Header";
import SourcesPanel from "@/components/SourcesPanel";
import OutputsPanel from "@/components/OutputsPanel";

export default function Home() {
  return (
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
  );
}
