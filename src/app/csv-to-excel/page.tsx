"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import Link from "next/link";

export default function CsvToExcelPage() {
  type Phase = "idle" | "ready" | "converting" | "success" | "error";

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_MB = 20;

  // Animate fake progress
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

  const readableSize = useMemo(() => {
    if (!file) return "";
    const mb = file.size / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }, [file]);

  const onSelect = (f: File) => {
    setError(null);
    setFile(null);

    if (!f.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      setPhase("error");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Max allowed is ${MAX_MB} MB.`);
      setPhase("error");
      return;
    }
    setFile(f);
    setPhase("ready");
  };

  const handleConvert = async () => {
    if (!file) return;
    try {
      setPhase("converting");

      Papa.parse(file, {
        complete: (result) => {
          const data = result.data as string[][];
          const ws = XLSX.utils.aoa_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          saveAs(new Blob([wbout]), "converted.xlsx");
          setPhase("success");
        },
        error: (err) => {
          setError(err.message);
          setPhase("error");
        },
      });
    } catch (e: unknown) {
      setError((e as Error).message || "Conversion failed.");
      setPhase("error");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1500px_800px_at_10%_-10%,#c7d2fe30,transparent_60%),radial-gradient(1200px_600px_at_100%_10%,#e0e7ff24,transparent_55%),linear-gradient(180deg,#0b1020_0%,#0a0f19_60%)] text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
            CSV → Excel (.xlsx)
          </div>
        </header>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Convert CSV to Excel
          </h1>
          <p className="mt-2 text-slate-300 max-w-2xl">
            Upload a CSV file and we’ll convert it into a clean Excel workbook
            (.xlsx) you can download instantly.
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
            className="group relative rounded-xl border-2 border-dashed border-white/15 hover:border-indigo-400/60 transition-colors p-8 sm:p-10 text-center cursor-pointer"
            aria-label="Upload a CSV file"
          >
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-indigo-500/10 ring-1 ring-indigo-400/30 grid place-items-center group-hover:bg-indigo-500/20">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-300"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-base sm:text-lg">
                Drag & drop your CSV here
              </p>
              <p className="text-sm text-slate-400">
                or click to browse — max {MAX_MB}MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSelect(f);
              }}
            />
          </div>

          {/* File chip + Actions */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-[40px]">
              {file ? (
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                  <span className="text-sm">
                    <span className="font-medium text-slate-100">
                      {file.name}
                    </span>
                    <span className="text-slate-400"> • {readableSize}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPhase("idle");
                      setError(null);
                    }}
                    className="ml-2 rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span className="text-sm text-slate-400">
                  No file selected yet.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06] transition"
              >
                Back
              </Link>
              <button
                disabled={!file || phase === "converting"}
                onClick={handleConvert}
                className="rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === "converting" ? "Converting…" : "Convert to Excel"}
              </button>
            </div>
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
                  className="h-full rounded-full bg-indigo-500 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {phase === "success" && (
            <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              ✅ Conversion complete. Your Excel file was downloaded.
            </div>
          )}

          {/* Tips */}
          <aside className="mt-8 grid gap-3 sm:grid-cols-3 text-xs text-slate-400">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              Supports CSV files up to {MAX_MB}MB.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              Automatically converts to Excel format (.xlsx).
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              Re-upload anytime if something looks off.
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
