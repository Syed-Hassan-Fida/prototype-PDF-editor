// @ts-nocheck
import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';

// Force Node.js runtime (pdf-lib needs Node, not Edge)
export const runtime = 'nodejs';

// Basic guards — tweak as needed
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_FILES = 50; // hard cap for MVP
const MAX_SIZE_PER_FILE = 25 * 1024 * 1024; // 25 MB per image

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const filesRaw = form.getAll('images');

    // Filter to just File instances
    const files = filesRaw.filter((v): v is File => v instanceof File);

    if (files.length === 0) {
      return new Response('No images provided. Send one or more files under the "images" field.', { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return new Response(`Too many files. Max ${MAX_FILES} images allowed.`, { status: 413 });
    }

    const pdf = await PDFDocument.create();

    for (const f of files) {
      if (!ALLOWED_TYPES.has(f.type)) {
        return new Response(`Unsupported image type: ${f.type}. Allowed: JPEG, PNG.`, { status: 415 });
      }
      if (f.size > MAX_SIZE_PER_FILE) {
        return new Response(`File \"${f.name}\" is too large. Max ${Math.round(MAX_SIZE_PER_FILE/1024/1024)}MB per image.`, { status: 413 });
      }

      const bytes = new Uint8Array(await f.arrayBuffer());

      // Embed image and size page to the exact image dimensions for crisp output
      const img = f.type === 'image/jpeg' ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
      const { width, height } = img.size();
      const page = pdf.addPage([width, height]);
      page.drawImage(img, { x: 0, y: 0, width, height });
    }

    const pdfBytes = await pdf.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=images.pdf',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[image-to-pdf] error:', err);
    return new Response('Failed to convert images to PDF.', { status: 500 });
  }
}
