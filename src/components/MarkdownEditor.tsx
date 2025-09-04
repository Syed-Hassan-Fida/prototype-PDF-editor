"use client";

import { useState } from "react";
import MarkdownPreview from "./MarkdownPreview";

export default function MarkdownEditor({ onConvert }: { onConvert: (md: string) => void }) {
  const [markdown, setMarkdown] = useState("");

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Markdown Input */}
      <div className="flex flex-col">
        <label className="mb-2 text-sm font-medium text-gray-300">Markdown Input</label>
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Write or paste your Markdown here..."
          className="flex-1 h-[32rem] p-4 rounded-xl bg-gray-800 border border-gray-700 text-white resize-none shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Markdown Preview */}
      <div className="flex flex-col">
        <label className="mb-2 text-sm font-medium text-gray-300">Live Preview</label>
        <div className="flex-1 h-[32rem] rounded-xl bg-gray-800 border border-gray-700 shadow-inner overflow-y-auto p-4">
          <MarkdownPreview content={markdown} />
        </div>
      </div>

      {/* Action Button */}
      <div className="col-span-2 flex justify-center mt-4">
        <button
          onClick={() => onConvert(markdown)}
          className="px-8 py-3 bg-green-600 rounded-xl shadow-lg hover:bg-green-700 transition-colors font-semibold"
        >
          ⚡ Convert to DOCX
        </button>
      </div>
    </div>
  );
}
