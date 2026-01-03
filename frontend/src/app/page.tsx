import ProcessMonitor from "@/components/ProcessMonitor";
import IngestionPanel from "@/components/IngestionPanel";
import ResultPreview from "@/components/ResultPreview";
import SchemaEditor from "@/components/SchemaEditor";
import { BeamDemo } from "@/components/BeamDemo";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50/50 dark:bg-black p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Data Extraction Pipeline
            </h1>
            <p className="text-zinc-500 mt-2">
              Transform unstructured documents into structured data with AI.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 my-auto animate-pulse" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 my-auto">System Operational</span>
          </div>
        </div>

        {/* content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Configuration */}
          <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
            <IngestionPanel />
            <div className="flex-1 min-h-[400px]">
              <SchemaEditor />
            </div>
          </div>

          {/* Right Column: Execution & Results */}
          <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
            <ProcessMonitor />
            <div className="flex-1 min-h-[400px]">
              <ResultPreview />
            </div>
          </div>

        </div>

        {/* Beam Demo Integration */}
        <div className="w-full pb-8">
          <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">System Connectivity (Beam Test)</h2>
          <BeamDemo />
        </div>
      </div>
    </main>
  );
}
