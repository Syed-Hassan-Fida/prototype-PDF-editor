// @ts-nocheck
import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export const runtime = 'nodejs';

// For custom script fonts, drop .ttf files in public/fonts and list them here
// (filenames are examples; provide these files yourself or switch to StandardFonts)
const FONT_FILES: Record<string, string> = {
  'Great Vibes': 'GreatVibes-Regular.ttf',
  'Dancing Script': 'DancingScript-Regular.ttf',
  'Pacifico': 'Pacifico-Regular.ttf',
  'Caveat': 'Caveat-Regular.ttf',
  'Sacramento': 'Sacramento-Regular.ttf',
  'Allura': 'Allura-Regular.ttf',
  'Satisfy': 'Satisfy-Regular.ttf',
};

async function getFontBytesByName(name?: string) {
  if (!name) return null;
  const file = FONT_FILES[name];
  if (!file) return null;
  const fp = path.join(process.cwd(), 'public', 'fonts', file);
  try { return await fs.readFile(fp); } catch { return null; }
}

function hexToRgb(hex: string) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return rgb(0,0,0);
  return rgb(parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255);
}

/**
 * Request (multipart/form-data):
 *  - pdf: File
 *  - placements: stringified JSON array of objects with either { dataUrl } OR { text, fontName }
 *      [{ pageIndex, xPt, yPt, widthPt, heightPt, dataUrl? , text?, fontName?, color?, sizePt? }]
 *  - reason?: string
 *  - signedAt?: string (ISO)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('pdf');
    if (!(file instanceof File)) return new Response('Missing pdf file', { status: 400 });

    const placementsRaw = String(form.get('placements') || '[]');
    let placements: any[] = [];
    try { placements = JSON.parse(placementsRaw); } catch {}

    const reason = String(form.get('reason') || '');
    const signedAt = String(form.get('signedAt') || new Date().toISOString());

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFDocument.load(inputBytes);

    // If any placement uses text + fontName, embed the font once
    const uniqueFontNames = Array.from(new Set(placements.map(p => p.fontName).filter(Boolean)));
    const embeddedFonts: Record<string, any> = {};
    for (const name of uniqueFontNames) {
      const ttf = await getFontBytesByName(name);
      if (ttf) {
        embeddedFonts[name] = await pdf.embedFont(ttf);
      } else {
        // Fallback to Helvetica if custom font not found
        embeddedFonts[name] = await pdf.embedFont(StandardFonts.Helvetica);
      }
    }

    for (const p of placements) {
      const page = pdf.getPage(p.pageIndex ?? 0);
      if (p.dataUrl) {
        // PNG placement
        const base64 = String(p.dataUrl).split(',')[1] || '';
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const img = await pdf.embedPng(bytes);
        page.drawImage(img, { x: p.xPt ?? 0, y: p.yPt ?? 0, width: p.widthPt ?? 100, height: p.heightPt ?? 40 });
      } else if (p.text) {
        const f = embeddedFonts[p.fontName] || (await pdf.embedFont(StandardFonts.Helvetica));
        const color = hexToRgb(p.color || '#000000');
        const size = Number(p.sizePt || 18);
        page.drawText(String(p.text), { x: p.xPt ?? 0, y: p.yPt ?? 0, size, font: f, color });
      }
    }

    // Minimal audit via metadata
    if (reason) pdf.setSubject(`Signed: ${reason}`);
    pdf.setProducer('File Conversion Toolkit — Signer');
    pdf.setCreator('File Conversion Toolkit');
    pdf.setCreationDate(new Date(signedAt));
    pdf.setModificationDate(new Date());

    const out = await pdf.save();
    const blob = new Blob([out], { type: 'application/pdf' });

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=signed.pdf',
        'Cache-Control': 'no-store',
        'X-Signature-Meta': encodeURIComponent(JSON.stringify({ reason, signedAt })),
      },
    });
  } catch (e) {
    console.error('[sign] error', e);
    return new Response('Failed to sign PDF', { status: 500 });
  }
}
