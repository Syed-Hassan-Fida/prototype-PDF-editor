import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { docToMarkdown } from "@/lib/docxToMarkdown";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

        // Save file temporarily
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filePath = path.join(process.cwd(), "tmp", file.name);
        await fs.writeFile(filePath, buffer);

        // Convert DOCX → Markdown
        const markdown = await docToMarkdown(filePath);

        return NextResponse.json({ markdown });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
