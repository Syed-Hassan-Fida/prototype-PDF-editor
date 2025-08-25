// @ts-nocheck
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Rnd } from 'react-rnd';

// Worker (must match installed pdfjs-dist version)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Available fonts (Standard only)
const FONT_MAP: Record<string, string> = {
    Courier: StandardFonts.Courier,
    CourierBold: StandardFonts.CourierBold,
    CourierOblique: StandardFonts.CourierOblique,
    CourierBoldOblique: StandardFonts.CourierBoldOblique,
    Helvetica: StandardFonts.Helvetica,
    HelveticaBold: StandardFonts.HelveticaBold,
    HelveticaOblique: StandardFonts.HelveticaOblique,
    HelveticaBoldOblique: StandardFonts.HelveticaBoldOblique,
    TimesRoman: StandardFonts.TimesRoman,
    TimesRomanBold: StandardFonts.TimesRomanBold,
    TimesRomanItalic: StandardFonts.TimesRomanItalic,
    TimesRomanBoldItalic: StandardFonts.TimesRomanBoldItalic,
    Symbol: StandardFonts.Symbol,
};

const FONT_FAMILY_MAP: Record<keyof typeof FONT_MAP, string> = {
    Courier: 'Courier, monospace',
    CourierBold: 'Courier, monospace',
    CourierOblique: 'Courier, monospace',
    CourierBoldOblique: 'Courier, monospace',
    Helvetica: 'Helvetica, Arial, sans-serif',
    HelveticaBold: 'Helvetica, Arial, sans-serif',
    HelveticaOblique: 'Helvetica, Arial, sans-serif',
    HelveticaBoldOblique: 'Helvetica, Arial, sans-serif',
    TimesRoman: '"Times New Roman", Times, serif',
    TimesRomanBold: '"Times New Roman", Times, serif',
    TimesRomanItalic: '"Times New Roman", Times, serif',
    TimesRomanBoldItalic: '"Times New Roman", Times, serif',
    Symbol: 'Symbol',
};

// Normalized placement type for text block
type PlacedText = {
    id: string;
    pageIndex: number;
    x: number; // 0..1
    y: number;
    w: number;
    h: number;
    text: string;
    font: keyof typeof FONT_MAP;
    color: string;
    size: number; // px
};

const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

export default function PdfSignPage() {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.2);

    // Signature builder
    const [sigText, setSigText] = useState('Your Name');
    const [sigFont, setSigFont] = useState<keyof typeof FONT_MAP>('Helvetica');
    const [sigColor, setSigColor] = useState('#0ea5e9');
    const [sigSize, setSigSize] = useState(24);

    const [placed, setPlaced] = useState<PlacedText[]>([]);

    // Track page sizes
    const pageContainersRef = useRef<(HTMLDivElement | null)[]>([]);
    const pageCssSizeRef = useRef<{ w: number; h: number }[]>([]);
    const resizeObserversRef = useRef<(ResizeObserver | null)[]>([]);

    const observePageSize = (pageIndex: number) => {
        const el = pageContainersRef.current[pageIndex];
        if (!el || resizeObserversRef.current[pageIndex]) return;

        const setSize = () => {
            const rect = el.getBoundingClientRect();
            pageCssSizeRef.current[pageIndex] = { w: rect.width, h: rect.height };
        };
        setSize();
        const ro = new ResizeObserver(setSize);
        ro.observe(el);
        resizeObserversRef.current[pageIndex] = ro;
    };

    const onSigDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(
            'application/x-signature',
            JSON.stringify({
                text: sigText,
                font: sigFont,
                color: sigColor,
                size: sigSize,
            })
        );
    };

    const onPageDrop = (pageIndex: number, e: React.DragEvent) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('application/x-signature');
        if (!raw) return;
        const meta = JSON.parse(raw);

        const host = pageContainersRef.current[pageIndex];
        if (!host) return;
        const rect = host.getBoundingClientRect();

        // Calculate normalized coords
        const xNorm = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const yNorm = clamp((e.clientY - rect.top) / rect.height, 0, 1);

        const wNorm = clamp(200 / rect.width, 0.05, 1);
        const hNorm = clamp(60 / rect.height, 0.05, 1);

        setPlaced(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                pageIndex,
                x: clamp(xNorm - wNorm / 2, 0, 1 - wNorm),
                y: clamp(yNorm - hNorm / 2, 0, 1 - hNorm),
                w: wNorm,
                h: hNorm,
                ...meta,
            },
        ]);
    };

    const onPageDragOver = (e: React.DragEvent) => e.preventDefault();
    const removePlaced = (id: string) =>
        setPlaced(p => p.filter(x => x.id !== id));

    const onPageRenderSuccess = (pageIndex: number) => {
        observePageSize(pageIndex);
    };

    const handleDownload = async () => {
        if (!file) return;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdfDoc = await PDFDocument.load(bytes);

        for (const block of placed) {
            const page = pdfDoc.getPage(block.pageIndex);
            const { width: W, height: H } = page.getSize();

            let font;
            try {
                font = await pdfDoc.embedFont(
                    FONT_MAP[block.font] || StandardFonts.Helvetica
                );
            } catch {
                font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }

            const boxW = block.w * W;
            const boxH = block.h * H;
            const boxX = block.x * W;
            const boxY = H - block.y * H - boxH;

            const textWidth = font.widthOfTextAtSize(block.text, block.size);
            const textHeight = font.heightAtSize(block.size);

            const xPt = boxX + (boxW - textWidth) / 2;
            const yPt = boxY + (boxH - textHeight) / 2 + textHeight * 0.2;

            const hex = block.color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;

            page.drawText(block.text, {
                x: xPt,
                y: yPt,
                size: block.size,
                font,
                color: rgb(r, g, b),
            });
        }

        const out = await pdfDoc.save();
        const blob = new Blob([out], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signed.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const allowDownload = !!file && placed.length > 0;

    const renderPages = useMemo(() => {
        return new Array(numPages).fill(0).map((_, i) => (
            <div
                key={i}
                ref={el => (pageContainersRef.current[i] = el)}
                className="relative rounded-xl overflow-hidden border border-white/10 bg-black/10"
                onDrop={e => onPageDrop(i, e)}
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
                    const pagePlaced = placed.filter(p => p.pageIndex === i);

                    return pagePlaced.map(p => (
                        <Rnd
                            key={p.id}
                            bounds="parent"
                            size={{ width: p.w * cssSize.w, height: p.h * cssSize.h }}
                            position={{ x: p.x * cssSize.w, y: p.y * cssSize.h }}
                            onDragStop={(e, d) => {
                                setPlaced(prev =>
                                    prev.map(s =>
                                        s.id === p.id
                                            ? { ...s, x: d.x / cssSize.w, y: d.y / cssSize.h }
                                            : s
                                    )
                                );
                            }}
                            onResizeStop={(e, dir, ref, delta, pos) => {
                                const newW = parseFloat(ref.style.width) / cssSize.w;
                                const newH = parseFloat(ref.style.height) / cssSize.h;
                                setPlaced(prev =>
                                    prev.map(s =>
                                        s.id === p.id
                                            ? {
                                                ...s,
                                                w: newW,
                                                h: newH,
                                                x: pos.x / cssSize.w,
                                                y: pos.y / cssSize.h,
                                            }
                                            : s
                                    )
                                );
                            }}
                            enableResizing
                            className="absolute border border-indigo-400 rounded"
                        >
                            <div
                                className="relative w-full h-full flex items-center justify-center text-center cursor-move select-none"
                                style={{
                                    fontFamily: FONT_FAMILY_MAP[p.font] || 'sans-serif',
                                    fontSize: `${p.size}px`,
                                    color: p.color,
                                }}
                            >
                                {p.text}
                                <button
                                    type="button"
                                    onClick={e => {
                                        e.stopPropagation();
                                        removePlaced(p.id);
                                    }}
                                    className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white text-[10px] px-1.5 py-0.5 shadow hover:bg-red-700 z-999"
                                >
                                    ×
                                </button>
                            </div>
                        </Rnd>
                    ));
                })()}
            </div>
        ));
    }, [numPages, placed, scale]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <header className="flex items-center justify-between mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition"
                    >
                        ← Back to Home
                    </Link>
                    <div className="text-xs sm:text-sm text-slate-400">PDF Signer</div>
                </header>

                <div className="grid gap-6 md:grid-cols-12">
                    {/* Controls */}
                    <aside className="md:col-span-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
                        <h2 className="text-lg font-medium mb-3">
                            Upload & Build Signature
                        </h2>

                        {/* Upload */}
                        <div
                            role="button"
                            tabIndex={0}
                            className="group mb-4 rounded-xl border-2 border-dashed border-white/15 p-4 text-center cursor-pointer hover:border-indigo-400/60"
                            onClick={() =>
                                document.getElementById('pdf-input')?.click()
                            }
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ')
                                    document.getElementById('pdf-input')?.click();
                            }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                                e.preventDefault();
                                const f = e.dataTransfer.files?.[0];
                                if (f && f.type === 'application/pdf') setFile(f);
                            }}
                        >
                            <p className="text-sm">
                                Drag & drop a PDF here or click to browse
                            </p>
                            <input
                                id="pdf-input"
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                onChange={e => {
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
                            <label className="block text-sm">
                                Your name / signature text
                            </label>
                            <input
                                value={sigText}
                                onChange={e => setSigText(e.target.value)}
                                placeholder="Type your name"
                                className="input w-full"
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm mb-1">Font</label>
                                    <select
                                        value={sigFont}
                                        onChange={e =>
                                            setSigFont(e.target.value as keyof typeof FONT_MAP)
                                        }
                                        className="input w-full"
                                    >
                                        {Object.keys(FONT_MAP).map(k => (
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
                                        onChange={e => setSigColor(e.target.value)}
                                        className="h-10 w-full rounded-lg bg-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm">Size: {sigSize}px</label>
                                <input
                                    type="range"
                                    min={10}
                                    max={100}
                                    value={sigSize}
                                    onChange={e => setSigSize(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Preview */}
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <div className="text-xs text-slate-400 mb-1">
                                    Preview (drag this onto the PDF)
                                </div>
                                <div
                                    draggable
                                    onDragStart={onSigDragStart}
                                    className="inline-flex items-center justify-center px-3 py-2 cursor-grab active:cursor-grabbing rounded border border-dashed border-slate-400/40"
                                    style={{
                                        fontFamily: FONT_FAMILY_MAP[sigFont],
                                        fontSize: `${sigSize}px`,
                                        color: sigColor,
                                    }}
                                >
                                    {sigText}
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
