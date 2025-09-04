"use client";

import { useState } from "react";
import MarkdownEditor from "@/components/MarkdownEditor";

export default function MarkToDocPage() {
  const [docUrl, setDocUrl] = useState("");

  const handleConvert = async (markdown: string) => {
    try {
      const res = await fetch("/api/convert-mark-to-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });

      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDocUrl(url);
    } catch (error) {
      console.error("Conversion failed:", error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 text-center bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
          Markdown → DOCX Converter
        </h1>

        <MarkdownEditor onConvert={handleConvert} />

        {docUrl && (
          <div className="mt-6 text-center">
            <a
              href={docUrl}
              download="converted.docx"
              className="px-6 py-3 bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              ⬇ Download DOCX
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
