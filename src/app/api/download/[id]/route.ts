// @ts-nocheck
import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // 👈 notice Promise<>
) {
  try {
    const { id } = await context.params; // 👈 await it
    const tmpDir = path.join(process.cwd(), "tmp");
    const pdfPath = path.join(tmpDir, `${id}.pdf`);
    const zipPath = path.join(tmpDir, `${id}.zip`);

    const fileBuffer = await fs.readFile(zipPath);

    // Delete files after serving
    await Promise.allSettled([fs.unlink(pdfPath), fs.unlink(zipPath)]);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=pdf-images.zip`,
      },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: "File not found or already deleted",
        subject: (err as Error).message ?? String(err),
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
