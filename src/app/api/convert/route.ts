import { NextRequest, NextResponse } from "next/server";
import { PdfToImageConverter } from "@/lib/pdfToImage";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Create unique IDs for this request
    const uniqueId = crypto.randomUUID();
    const tmpDir = path.join(process.cwd(), "tmp");
    const pdfPath = path.join(tmpDir, `${uniqueId}.pdf`);
    const zipPath = path.join(tmpDir, `${uniqueId}.zip`);

    // Ensure tmp directory exists
    await fs.mkdir(tmpDir, { recursive: true });

    // Save uploaded PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(pdfPath, buffer);

    // Convert PDF → images
    const images = await PdfToImageConverter(pdfPath);

    // Bundle into ZIP
    const zip = new JSZip();
    for (let i = 0; i < images.length; i++) {
      const res = await fetch(images[i]);
      const blob = await res.arrayBuffer();
      zip.file(`page-${i + 1}.png`, blob);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });
    await fs.writeFile(zipPath, zipContent);

    // Respond with unique download URL
    return NextResponse.json({
      zip: `/api/download/${uniqueId}`, // dynamic download endpoint
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
