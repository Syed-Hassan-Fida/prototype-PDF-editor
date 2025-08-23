'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

export default function ImageToPdfPage() {
  type Phase = 'idle' | 'ready' | 'uploading' | 'converting' | 'success' | 'error';

  type Item = { id: string; file: File; url: string };

  const [phase, setPhase] = useState<Phase>('idle');
  const [items, setItems] = useState<Item[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  const MAX_FILES = 30;
  const MAX_MB_PER_FILE = 25;

  // Progress animation
  useEffect(() => {
    if (phase === 'uploading' || phase === 'converting') {
      setProgress((p) => (p < 15 ? 15 : p));
      const t = setInterval(() => {
        setProgress((p) => (p < 92 ? p + Math.random() * 4 : p));
      }, 300);
      return () => clearInterval(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'success') setProgress(100);
    if (phase === 'error') setProgress(0);
  }, [phase]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      items.forEach((it) => URL.revokeObjectURL(it.url));
    };
  }, [items]);

  const totalSizeMB = useMemo(() => {
    const bytes = items.reduce((acc, it) => acc + it.file.size, 0);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [items]);

  const addFiles = (files: FileList | File[]) => {
    setError(null);
    setPdfUrl(null);

    const list = Array.from(files);
    if (items.length + list.length > MAX_FILES) {
      setError(`Too many files. Max ${MAX_FILES} images allowed.`);
      setPhase('error');
      return;
    }

    const newItems: Item[] = [];
    for (const f of list) {
      if (!f.type.startsWith('image/')) {
        setError('Only image files are supported (PNG/JPG/WebP).');
        setPhase('error');
        return;
      }
      if (f.size > MAX_MB_PER_FILE * 1024 * 1024) {
        setError(`"${f.name}" is too large. Max ${MAX_MB_PER_FILE}MB per image.`);
        setPhase('error');
        return;
      }
      newItems.push({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f) });
    }

    setItems((prev) => {
      const merged = [...prev, ...newItems];
      if (merged.length > 0) setPhase('ready');
      return merged;
    });
  };

  const clearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.url));
    setItems([]);
    setPdfUrl(null);
    setError(null);
    setPhase('idle');
    setProgress(0);
  };

  const removeAt = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const [rm] = copy.splice(index, 1);
      if (rm) URL.revokeObjectURL(rm.url);
      if (copy.length === 0) setPhase('idle');
      return copy;
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const handleDropReorder = (toIndex: number) => {
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null) return;
    move(fromIndex, toIndex);
    dragIndexRef.current = null;
  };

  const handleConvert = async () => {
    try {
      setError(null);
      setPdfUrl(null);

      if (items.length === 0) {
        setError('Please add at least one image.');
        setPhase('error');
        return;
      }

      setPhase('uploading');

      const fd = new FormData();
      // Keep current order
      for (const it of items) fd.append('images', it.file, it.file.name);

      const res = await fetch('/api/image-to-pdf', { method: 'POST', body: fd });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPhase('success');
        return;
      }

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Conversion failed.');
        if (data.pdf) {
          setPdfUrl(data.pdf);
          setPhase('success');
          return;
        }
      }

      const msg = await res.text();
      throw new Error(msg || 'Conversion failed.');
    } catch (e: any) {
      setError(e?.message || 'Unexpected error.');
      setPhase('error');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1500px_800px_at_10%_-10%,#c7d2fe30,transparent_60%),radial-gradient(1200px_600px_at_100%_10%,#e0e7ff24,transparent_55%),linear-gradient(180deg,#0b1020_0%,#0a0f19_60%)] text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="m15 18-6-6 6-6"/></svg>
            Back to Home
          </Link>
          <div className="text-xs sm:text-sm text-slate-400">Images → PDF</div>
        </header>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Convert Images to PDF</h1>
          <p className="mt-2 text-slate-300 max-w-2xl">Upload one or more images, arrange them in your preferred order, and we’ll compile a crisp PDF.</p>
        </div>

        {/* Card */}
        <main className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.35)] p-6 sm:p-8">
          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const fl = e.dataTransfer.files;
              if (fl && fl.length) addFiles(fl);
            }}
            className="group relative rounded-xl border-2 border-dashed border-white/15 hover:border-indigo-400/60 transition-colors p-8 sm:p-10 text-center cursor-pointer"
            aria-label="Upload images via file dialog or drag & drop"
          >
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-indigo-500/10 ring-1 ring-indigo-400/30 grid place-items-center group-hover:bg-indigo-500/20">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div className="space-y-1">
              <p className="text-base sm:text-lg">Drag & drop images here</p>
              <p className="text-sm text-slate-400">or click to browse — up to {MAX_FILES} files, {MAX_MB_PER_FILE}MB each</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files.length) addFiles(e.target.files);
              }}
            />
          </div>

          {/* Gallery & Controls */}
          <section className="mt-6">
            {items.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-slate-300">{items.length} image{items.length>1?'s':''} • {totalSizeMB} MB total</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06]"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06]"
                    >
                      Add More
                    </button>
                  </div>
                </div>

                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((it, idx) => (
                    <li
                      key={it.id}
                      draggable
                      onDragStart={() => (dragIndexRef.current = idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropReorder(idx)}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                      aria-label={`Image ${idx + 1}: ${it.file.name}`}
                    >
                      <img src={it.url} alt={it.file.name} className="h-28 w-full object-cover" />
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />

                      <div className="absolute top-2 left-2 text-[11px] rounded-md bg-black/60 px-1.5 py-0.5">#{idx + 1}</div>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => move(idx, idx - 1)}
                            className="rounded-md bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
                            aria-label="Move left"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => move(idx, idx + 1)}
                            className="rounded-md bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
                            aria-label="Move right"
                          >
                            →
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          className="rounded-md bg-red-500/80 px-2 py-1 text-[11px] hover:bg-red-500"
                          aria-label="Remove image"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-400">No images selected yet.</p>) }
          </section>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06] transition">
              Back
            </Link>
            <button
              disabled={items.length === 0 || phase === 'uploading' || phase === 'converting'}
              onClick={handleConvert}
              className="rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === 'uploading' || phase === 'converting' ? 'Converting…' : 'Convert to PDF'}
            </button>
          </div>

          {/* Progress */}
          {(phase === 'uploading' || phase === 'converting' || phase === 'success') && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{phase === 'success' ? 'Done' : 'Processing'}</span>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                <p>{error}</p>
              </div>
            </div>
          )}

          {pdfUrl && phase === 'success' && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
              <div className="flex items-center gap-2 text-emerald-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-sm">Conversion complete. Your PDF is ready.</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-400/20"
                >
                  Preview
                </a>
                <a
                  href={pdfUrl}
                  download="images.pdf"
                  className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Download PDF
                </a>
              </div>
            </div>
          )}

          {/* Tips */}
          <aside className="mt-8 grid gap-3 sm:grid-cols-3 text-xs text-slate-400">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">Supported: PNG, JPG/JPEG, WebP.</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">Reorder by dragging thumbnails or use the arrows.</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">Each image becomes one PDF page, sized to the image.</div>
          </aside>
        </main>
      </div>
    </div>
  );
}
