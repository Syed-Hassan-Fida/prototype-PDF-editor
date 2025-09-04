"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MarkdownPreview from "@/components/MarkdownPreview";

export default function DocToMarkPage() {
  type Phase = "idle" | "converting" | "success" | "error";

  const [phase, setPhase] = useState<Phase>("idle");
  const [markdown, setMarkdown] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Progress animation
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

  const onSelect = async (f: File) => {
    setFile(f);
    setFileMeta({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
    });

    try {
      setError(null);
      setMarkdown("");
      setPhase("converting");

      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/convert-doc-to-mark", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMarkdown(data.markdown || "");
      setPhase("success");
    } catch (e: unknown) {
      setError((e as Error).message || "Conversion failed.");
      setPhase("error");
    }
  };

  const handleDownload = () => {
    if (!markdown) return;
    const name = file?.name.replace(/\.docx$/i, "") + ".md";
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "document.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1500px_800px_at_10%_-10%,#60a5fa30,transparent_60%),radial-gradient(1200px_600px_at_100%_10%,#818cf824,transparent_55%),linear-gradient(180deg,#0b1020_0%,#0a0f19_60%)] text-slate-100">
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
            DOCX → Markdown
          </div>
        </header>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Convert Word Documents to Markdown
          </h1>
          <p className="mt-2 text-slate-300 max-w-2xl">
            Upload a DOCX file and instantly extract clean Markdown with live
            preview and download.
          </p>
        </div>

        {/* Card */}
        <main className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.35)] p-6 sm:p-8">
          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onSelect(f);
            }}
            className="group relative rounded-xl border-2 border-dashed border-white/15 hover:border-blue-400/60 transition-colors p-10 text-center cursor-pointer"
            aria-label="Upload a DOCX via file dialog or drag & drop"
          >
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-500/10 ring-1 ring-blue-400/30 grid place-items-center group-hover:bg-blue-500/20">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-300"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-base sm:text-lg">Drag & drop your DOCX here</p>
            <p className="text-sm text-slate-400">
              or click to browse — Word files only
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".docx"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSelect(f);
              }}
            />
          </div>

          {/* File chip */}
          <div className="mt-6 min-h-[40px]">
            {fileMeta ? (
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-300"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-sm">
                  <span className="font-medium text-slate-100">
                    {fileMeta.name}
                  </span>
                  <span className="text-slate-400"> • {fileMeta.size}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileMeta(null);
                    setMarkdown("");
                    setPhase("idle");
                    setError(null);
                  }}
                  className="ml-2 rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-sm text-slate-400">No file selected yet.</span>
            )}
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
                  className="h-full rounded-full bg-blue-500 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
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

          {/* Results */}
          {markdown && phase === "success" && (
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium text-slate-300">
                  Extracted Markdown
                </label>
                <textarea
                  readOnly
                  value={markdown}
                  className="flex-1 h-[28rem] p-4 rounded-xl bg-white/[0.02] border border-white/10 text-slate-100 resize-none shadow-inner overflow-y-auto"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium text-slate-300">
                  Live Preview
                </label>
                <div className="flex-1 h-[28rem] rounded-xl bg-white/[0.02] border border-white/10 shadow-inner overflow-y-auto p-4">
                  <MarkdownPreview content={markdown} />
                </div>
              </div>
            </div>
          )}

          {markdown && phase === "success" && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleDownload}
                className="rounded-lg bg-gradient-to-b from-purple-400 to-purple-600 px-5 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⬇ Download Markdown
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
