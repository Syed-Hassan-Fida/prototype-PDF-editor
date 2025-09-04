"use client";

import { useState } from "react";
import FileDropzone from "@/components/FileDropzone";
import MarkdownPreview from "@/components/MarkdownPreview";

export default function DocToMarkPage() {
  const [markdown, setMarkdown] = useState("");
  const [fileName, setFileName] = useState("document.md");
  const [fileMeta, setFileMeta] = useState<{ name: string; size: string } | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name.replace(/\.docx$/i, "") + ".md");
    setFileMeta({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/convert-doc-to-mark", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setMarkdown(data.markdown || "");
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          DOCX → Markdown Converter
        </h1>

        <FileDropzone onFileAccepted={handleFile} />

        {fileMeta && (
          <div className="mt-4 text-sm text-gray-400 text-center">
            <p>📄 {fileMeta.name} ({fileMeta.size})</p>
          </div>
        )}

        {markdown && (
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-300">Extracted Markdown</label>
              <textarea
                readOnly
                value={markdown}
                className="flex-1 h-[32rem] p-4 rounded-xl bg-gray-800 border border-gray-700 text-white resize-none shadow-inner overflow-y-auto"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-300">Live Preview</label>
              <div className="flex-1 h-[32rem] rounded-xl bg-gray-800 border border-gray-700 shadow-inner overflow-y-auto p-4">
                <MarkdownPreview content={markdown} />
              </div>
            </div>
          </div>
        )}

        {markdown && (
          <div className="mt-6 text-center">
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              ⬇ Download Markdown
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
