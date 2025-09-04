"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MarkdownEditor from "@/components/MarkdownEditor";

export default function MarkToDocPage() {
  type Phase = "idle" | "converting" | "success" | "error";

  const [phase, setPhase] = useState<Phase>("idle");
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const editorRef = useRef<{ getValue: () => string }>(null);

  // Animate progress bar
  useEffect(() => {
    if (phase === "converting") {
      setProgress(15);
      const t = setInterval(() => {
        setProgress((p) => (p < 90 ? p + Math.random() * 5 : p));
      }, 350);
      return () => clearInterval(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "success") setProgress(100);
    if (phase === "error") setProgress(0);
  }, [phase]);

  const handleConvert = async (markdown: string) => {
    try {
      setError(null);
      setDocUrl(null);
      setPhase("converting");

      const res = await fetch("/api/convert-mark-to-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });

      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDocUrl(url);
      setPhase("success");
    } catch (e: unknown) {
      setError((e as Error).message || "Unexpected error.");
      setPhase("error");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1500px_800px_at_10%_-10%,#c084fc30,transparent_60%),radial-gradient(1200px_600px_at_100%_10%,#a855f724,transparent_55%),linear-gradient(180deg,#0b1020_0%,#0a0f19_60%)] text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-80"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
          <div className="text-xs sm:text-sm text-slate-400">
            Markdown → DOCX
          </div>
        </header>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Convert Markdown to Word (DOCX)
          </h1>
          <p className="mt-2 text-slate-300 max-w-2xl">
            Paste or write your Markdown, preview it live, and generate a DOCX
            file instantly.
          </p>
        </div>

        {/* Card */}
        <main className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.35)] p-6 sm:p-8">
          {/* Editor */}
          <MarkdownEditor
            ref={editorRef}
          />

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3 justify-end">
            <button
              disabled={phase === "converting"}
              onClick={() =>
                editorRef.current &&
                handleConvert(editorRef.current.getValue())
              }
              className="rounded-lg bg-gradient-to-b from-purple-400 to-purple-600 px-5 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === "converting" ? "Converting…" : "⚡ Convert to DOCX"}
            </button>
          </div>

          {/* Progress */}
          {(phase === "converting" || phase === "success") && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{phase === "success" ? "Done" : "Processing"}</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-purple-500 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <div className="flex items-start gap-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12" y2="16" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}

          {docUrl && phase === "success" && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
              <div className="flex items-center gap-2 text-emerald-200">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm">
                  Conversion complete. Your DOCX is ready.
                </span>
              </div>
              <a
                href={docUrl}
                download="converted.docx"
                className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Download DOCX
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
