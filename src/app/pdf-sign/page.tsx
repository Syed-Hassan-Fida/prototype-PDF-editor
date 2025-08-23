// @ts-nocheck
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import { Rnd } from 'react-rnd';

// Worker (must match installed pdfjs-dist version)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Fonts
import {
  Great_Vibes,
  Dancing_Script,
  Pacifico,
  Caveat,
  Sacramento,
  Allura,
  Satisfy,
} from 'next/font/google';
const fGreatVibes = Great_Vibes({ subsets: ['latin'], weight: '400' });
const fDancing = Dancing_Script({ subsets: ['latin'], weight: ['400', '700'] });
const fPacifico = Pacifico({ subsets: ['latin'], weight: '400' });
const fCaveat = Caveat({ subsets: ['latin'], weight: ['400', '700'] });
const fSacra = Sacramento({ subsets: ['latin'], weight: '400' });
const fAllura = Allura({ subsets: ['latin'], weight: '400' });
const fSatisfy = Satisfy({ subsets: ['latin'], weight: '400' });

const FONT_MAP: Record<string, string> = {
  'Great Vibes': fGreatVibes.style.fontFamily,
  'Dancing Script': fDancing.style.fontFamily,
  Pacifico: fPacifico.style.fontFamily,
  Caveat: fCaveat.style.fontFamily,
  Sacramento: fSacra.style.fontFamily,
  Allura: fAllura.style.fontFamily,
  Satisfy: fSatisfy.style.fontFamily,
};

// We store normalized placement so it’s scale/zoom/retina-proof.
// x,y,w,h are fractions of the page's CSS box (0..1).
type PlacedSig = {
  id: string;
  pageIndex: number; // 0-based
  x: number; // 0..1, left from page
  y: number; // 0..1, top from page
  w: number; // 0..1, width fraction
  h: number; // 0..1, height fraction
  dataUrl: string;
};

function dataUrlToUint8Array(dataURL: string) {
  const [, b64] = dataURL.split(',');
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function waitForFont(cssFamily: string, px = 72) {
  try {
    await (document as any).fonts.load(`${px}px "${cssFamily}"`);
    await (document as any).fonts.ready;
  } catch {}
}

function renderSignatureToDataURL(opts: {
  text: string;
  cssFamily: string;
  color: string;
  sizePx: number;
  padding?: number;
}) {
  const { text, cssFamily, color, sizePx, padding = 16 } = opts;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `${sizePx}px "${cssFamily}"`;
  const metrics = measure.measureText(text || ' ');
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(sizePx * 1.2);

  canvas.width = textWidth + padding * 2;
  canvas.height = textHeight + padding * 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${sizePx}px "${cssFamily}"`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text || ' ', padding, padding + textHeight / 2);
  return canvas.toDataURL('image/png');
}

// Clamp helper
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function PdfSignPage() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);

  // Signature builder
  const [sigText, setSigText] = useState('Your Name');
  const [sigFont, setSigFont] = useState<keyof typeof FONT_MAP>('Great Vibes');
  const [sigColor, setSigColor] = useState('#0ea5e9');
  const [sigSize, setSigSize] = useState(72);
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigPreviewSize, setSigPreviewSize] = useState<{ w: number; h: number }>({ w: 200, h: 60 });

  const [placed, setPlaced] = useState<PlacedSig[]>([]);

  // Track each page container and its current CSS size (for overlay math)
  const pageContainersRef = useRef<(HTMLDivElement | null)[]>([]);
  const pageCssSizeRef = useRef<{ w: number; h: number }[]>([]);
  const resizeObserversRef = useRef<(ResizeObserver | null)[]>([]);

  // Build signature preview whenever inputs change
  useEffect(() => {
    (async () => {
      const css = FONT_MAP[sigFont];
      await waitForFont(css, sigSize);
      const url = renderSignatureToDataURL({
        text: sigText,
        cssFamily: css,
        color: sigColor,
        sizePx: sigSize,
      });
      setSigDataUrl(url);

      // Measure the rendered image intrinsic size
      const img = new Image();
      img.onload = () => setSigPreviewSize({ w: img.width, h: img.height });
      img.src = url;
    })();
  }, [sigText, sigFont, sigColor, sigSize]);

  // Drag start from preview
  const onSigDragStart = (e: React.DragEvent) => {
    if (!sigDataUrl) return;
    e.dataTransfer.setData('application/x-signature', sigDataUrl);
    e.dataTransfer.setData('application/x-signature-size', JSON.stringify(sigPreviewSize));
  };

  // Ensure we keep page CSS sizes up-to-date (handles zoom/resize/scrollbars)
  const observePageSize = (pageIndex: number) => {
    const el = pageContainersRef.current[pageIndex];
    if (!el) return;
    // init once
    if (resizeObserversRef.current[pageIndex]) return;

    const setSize = () => {
      const rect = el.getBoundingClientRect();
      pageCssSizeRef.current[pageIndex] = { w: rect.width, h: rect.height };
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(el);
    resizeObserversRef.current[pageIndex] = ro;
  };

  // Drop onto a page container -> store as normalized fractions
  const onPageDrop = (pageIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const url = e.dataTransfer.getData('application/x-signature');
    if (!url) return;

    const sizeRaw = e.dataTransfer.getData('application/x-signature-size');
    let wPx = 200, hPx = 60;
    if (sizeRaw) {
      const sz = JSON.parse(sizeRaw);
      wPx = sz.w;
      hPx = sz.h;
    }
    const host = pageContainersRef.current[pageIndex];
    if (!host) return;
    const rect = host.getBoundingClientRect();

    const xPx = e.clientX - rect.left - wPx / 2; // center under cursor
    const yPx = e.clientY - rect.top - hPx / 2;

    const wNorm = clamp(wPx / rect.width, 0.02, 1);
    const hNorm = clamp(hPx / rect.height, 0.02, 1);
    const xNorm = clamp(xPx / rect.width, 0, 1 - wNorm);
    const yNorm = clamp(yPx / rect.height, 0, 1 - hNorm);

    setPlaced((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        pageIndex,
        x: xNorm,
        y: yNorm,
        w: wNorm,
        h: hNorm,
        dataUrl: url,
      },
    ]);
  };

  const onPageDragOver = (e: React.DragEvent) => e.preventDefault();
  const removePlaced = (id: string) => setPlaced((p) => p.filter((x) => x.id !== id));

  // After each page renders: start observing its CSS size
  const onPageRenderSuccess = (pageIndex: number) => {
    observePageSize(pageIndex);
  };

  // Download signed PDF client-side via pdf-lib
  const handleDownload = async () => {
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await PDFDocument.load(bytes);

    for (const sig of placed) {
      const page = pdfDoc.getPage(sig.pageIndex);
      const W = page.getWidth();  // PDF points
      const H = page.getHeight();

      // Convert normalized (top-left origin) to PDF points (bottom-left origin)
      const xPt = sig.x * W;
      const wPt = sig.w * W;
      const hPt = sig.h * H;
      const yPt = H - (sig.y * H + hPt); // flip Y

      const png = await pdfDoc.embedPng(dataUrlToUint8Array(sig.dataUrl));
      page.drawImage(png, { x: xPt, y: yPt, width: wPt, height: hPt });
    }

    const out = await pdfDoc.save();
    const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const allowDownload = !!file && placed.length > 0;

  // Render a list of pages with draggable/resizable overlays
  const renderPages = useMemo(() => {
    return new Array(numPages).fill(0).map((_, i) => (
      <div
        key={i}
        ref={(el) => (pageContainersRef.current[i] = el)}
        className="relative rounded-xl overflow-hidden border border-white/10 bg-black/10"
        onDrop={(e) => onPageDrop(i, e)}
        onDragOver={onPageDragOver}
      >
        <Page
          pageNumber={i + 1}
          scale={scale}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          onRenderSuccess={() => onPageRenderSuccess(i)}
          className="bg-white"
        />

        {/* Overlays */}
        {(() => {
          const cssSize = pageCssSizeRef.current[i] || { w: 1, h: 1 };
          const pagePlaced = placed.filter((p) => p.pageIndex === i);

          return pagePlaced.map((p) => {
            // Convert normalized -> pixels for current render
            const pxW = p.w * cssSize.w;
            const pxH = p.h * cssSize.h;
            const pxX = p.x * cssSize.w;
            const pxY = p.y * cssSize.h;

            return (
                <Rnd
                key={p.id}
                bounds="parent"
                size={{ width: pxW, height: pxH }}
                position={{ x: pxX, y: pxY }}
                onDragStop={(e, d) => {
                  // convert back to normalized fractions
                  const newXNorm = clamp(d.x / cssSize.w, 0, 1 - p.w);
                  const newYNorm = clamp(d.y / cssSize.h, 0, 1 - p.h);
              
                  setPlaced(prev =>
                    prev.map(s =>
                      s.id === p.id
                        ? { ...s, x: newXNorm, y: newYNorm } // store normalized
                        : s
                    )
                  );
                }}
                onResizeStop={(e, dir, ref, delta, position) => {
                  const newWNorm = clamp(parseFloat(ref.style.width) / cssSize.w, 0.02, 1);
                  const newHNorm = clamp(parseFloat(ref.style.height) / cssSize.h, 0.02, 1);
                  const newXNorm = clamp(position.x / cssSize.w, 0, 1 - newWNorm);
                  const newYNorm = clamp(position.y / cssSize.h, 0, 1 - newHNorm);
              
                  setPlaced(prev =>
                    prev.map(s =>
                      s.id === p.id
                        ? { ...s, x: newXNorm, y: newYNorm, w: newWNorm, h: newHNorm }
                        : s
                    )
                  );
                }}
                enableResizing={{
                  top: true,
                  right: true,
                  bottom: true,
                  left: true,
                  topRight: true,
                  bottomRight: true,
                  bottomLeft: true,
                  topLeft: true,
                }}
                className="absolute"
              >
                <div className="relative w-full h-full rounded-md ring-1 ring-white/20 bg-transparent cursor-move">
                  <img
                    src={p.dataUrl}
                    alt="signature"
                    className="pointer-events-none select-none w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => removePlaced(p.id)}
                    className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white text-[10px] px-1.5 py-0.5 shadow"
                  >
                    ×
                  </button>
                  <div className="absolute inset-0 rounded-md border border-dashed border-indigo-400/60 pointer-events-none" />
                </div>
              </Rnd>
              
            );
          });
        })()}
      </div>
    ));
  }, [numPages, placed, scale]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1500px_800px_at_10%_-10%,#c7d2fe30,transparent_60%),radial-gradient(1200px_600px_at_100%_10%,#e0e7ff24,transparent_55%),linear-gradient(180deg,#0b1020_0%,#0a0f19_60%)] text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="flex items-center justify-between mb-8">
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
          <div className="text-xs sm:text-sm text-slate-400">PDF Signer</div>
        </header>

        <div className="grid gap-6 md:grid-cols-12">
          {/* Controls */}
          <aside className="md:col-span-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
            <h2 className="text-lg font-medium mb-3">Upload & Build Signature</h2>

            {/* Upload */}
            <div
              role="button"
              tabIndex={0}
              className="group mb-4 rounded-xl border-2 border-dashed border-white/15 p-4 text-center cursor-pointer hover:border-indigo-400/60"
              onClick={() => document.getElementById('pdf-input')?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  document.getElementById('pdf-input')?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && f.type === 'application/pdf') setFile(f);
              }}
            >
              <p className="text-sm">Drag & drop a PDF here or click to browse</p>
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </div>
            {file && (
              <p className="mb-4 text-xs text-slate-400">
                Selected: <span className="text-slate-200">{file.name}</span>
              </p>
            )}

            <div className="h-px bg-white/10 my-4" />

            {/* Signature builder */}
            <div className="space-y-3">
              <label className="block text-sm">Your name / signature text</label>
              <input
                value={sigText}
                onChange={(e) => setSigText(e.target.value)}
                placeholder="Type your name"
                className="input w-full"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Font</label>
                  <select
                    value={sigFont}
                    onChange={(e) => setSigFont(e.target.value as any)}
                    className="input w-full"
                  >
                    {Object.keys(FONT_MAP).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Color</label>
                  <input
                    type="color"
                    value={sigColor}
                    onChange={(e) => setSigColor(e.target.value)}
                    className="h-10 w-full rounded-lg bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm">Size: {sigSize}px</label>
                <input
                  type="range"
                  min={32}
                  max={160}
                  value={sigSize}
                  onChange={(e) => setSigSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="text-xs text-slate-400 mb-1">
                  Preview (drag this onto the PDF)
                </div>
                <div className="flex items-center justify-center">
                  {sigDataUrl ? (
                    <img
                      src={sigDataUrl}
                      draggable
                      onDragStart={onSigDragStart}
                      alt="signature preview"
                      className="max-w-full select-none cursor-grab active:cursor-grabbing"
                      style={{ maxHeight: 140 }}
                    />
                  ) : (
                    <div className="text-sm text-slate-400">
                      Type text to generate signature…
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={!allowDownload}
                  onClick={handleDownload}
                  className="rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:brightness-110 disabled:opacity-50"
                >
                  Download Signed PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPlaced([])}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06]"
                >
                  Clear Marks
                </button>
              </div>
            </div>
          </aside>

          {/* Pages */}
          <section className="md:col-span-8 space-y-6 max-h-[75vh] overflow-auto pr-1">
            {!file && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
                Upload a PDF to start. Then drag the signature preview onto any
                page.
              </div>
            )}
            {file && (
              <Document
                file={file}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
                    Loading PDF…
                  </div>
                }
                error={
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
                    Failed to load PDF.
                  </div>
                }
              >
                {renderPages}
              </Document>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
