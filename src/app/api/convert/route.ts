// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { PdfToImageConverter } from "@/lib/pdfToImage";
import fs from "fs/promises";
import path from "path";
import { writeFileSync } from "fs";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // ---- Create ZIP ----
        const zip = new JSZip();

        // Save PDF temporarily
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfPath = path.join(process.cwd(), "tmp", file.name);
        await fs.writeFile(pdfPath, buffer);

        // Convert PDF -> Images
        const images = await PdfToImageConverter(pdfPath);

        for (let i = 0; i < images.length; i++) {
            // Fetch each image and add to zip
            const res = await fetch(images[i]);
            const blob = await res.arrayBuffer();
            zip.file(`page-${i + 1}.png`, blob);
        }

        const zipContent = await zip.generateAsync({ type: "nodebuffer" });

        // Save ZIP in public folder
        const zipPath = path.join(process.cwd(), "public", "pdf-images.zip");
        writeFileSync(zipPath, zipContent);

        return NextResponse.json({
            zip: "/pdf-images.zip",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
