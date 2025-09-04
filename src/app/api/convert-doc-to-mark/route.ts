import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import TurndownService from "turndown";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read file into buffer (no saving to disk)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract DOCX → HTML (preserves formatting)
    const { value: html } = await mammoth.convertToHtml({ buffer });

    // Convert HTML → Markdown
    const turndown = new TurndownService({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
    });

    turndown.addRule("strikethrough", {
      filter: ["del", "s"],
      replacement: (content) => `~~${content}~~`,
    });

    const markdown = turndown.turndown(html).trim();

    return NextResponse.json({ markdown });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
