"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function ExcelToCsvPage() {
  type Phase = "idle" | "ready" | "uploading" | "converting" | "success" | "error";

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_MB = 20;

  // Smooth progress animation
  useEffect(() => {
    if (phase === "uploading" || phase === "converting") {
      setProgress((p) => (p < 15 ? 15 : p));
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
    setCsvUrl(null);
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Please upload a valid Excel file (.xlsx or .xls).");
      setFile(null);
      setPhase("error");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Max allowed is ${MAX_MB} MB.`);
      setFile(null);
      setPhase("error");
      return;
    }
    setFile(f);
    setPhase("ready");
  };

  const handleConvert = async (f: File) => {
    try {
      setPhase("uploading");
      setError(null);
      setCsvUrl(null);

      // Read Excel locally (no API call needed)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          setPhase("converting");
          const wb = XLSX.read(e.target?.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(ws);

          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          setCsvUrl(url);
          setPhase("success");
        } catch (err: unknown) {
          setError("Conversion failed. Make sure the Excel file is valid.");
          setPhase("error");
        }
      };
      reader.readAsBinaryString(f);
    } catch (err: unknown) {
      setError("Conversion failed. Make sure the Excel file is valid.");
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
            Excel → CSV
          </div>
        </header>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Convert Excel to CSV
          </h1>
          <p className="mt-2 text-slate-300 max-w-2xl">
            Upload an Excel file (.xlsx or .xls) and we’ll convert its first
            sheet into a clean CSV file you can download instantly.
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
            aria-label="Upload an Excel file via file dialog or drag & drop"
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
                Drag & drop your Excel file here
              </p>
              <p className="text-sm text-slate-400">
                or click to browse — max {MAX_MB}MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
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
                      {file.name}
                    </span>
                    <span className="text-slate-400"> • {readableSize}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setCsvUrl(null);
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
                disabled={!file || phase === "uploading" || phase === "converting"}
                onClick={() => file && handleConvert(file)}
                className="rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === "uploading" || phase === "converting"
                  ? "Converting…"
                  : "Convert to CSV"}
              </button>
            </div>
          </div>

          {/* Progress */}
          {(phase === "uploading" ||
            phase === "converting" ||
            phase === "success") && (
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

          {csvUrl && phase === "success" && (
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
                  Conversion complete. Your CSV is ready.
                </span>
              </div>
              <a
                href={csvUrl}
                download="converted.csv"
                className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Download CSV
              </a>
            </div>
          )}

          {/* Tips */}
          <aside className="mt-8 grid gap-3 sm:grid-cols-3 text-xs text-slate-400">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              Supports Excel (.xls, .xlsx) up to {MAX_MB}MB.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              Converts the first sheet of your workbook into CSV.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              Having issues? Ensure the file is valid Excel format.
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
