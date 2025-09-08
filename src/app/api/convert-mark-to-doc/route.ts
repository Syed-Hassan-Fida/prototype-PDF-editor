// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { markdownToDoc } from "@/lib/markdownToDocx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { markdown } = body;

        if (!markdown) {
            return NextResponse.json({ error: "No markdown provided" }, { status: 400 });
        }

        // Convert markdown → docx buffer
        const buffer = await markdownToDoc(markdown);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": "attachment; filename=converted.docx",
            },
        });
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
