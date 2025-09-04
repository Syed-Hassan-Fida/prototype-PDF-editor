"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import MarkdownPreview from "./MarkdownPreview";

const MarkdownEditor = forwardRef(
  (_, ref) => {
    const [markdown, setMarkdown] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => markdown,
    }));

    const readableSize = (f: File) => {
      const mb = f.size / (1024 * 1024);
      return `${mb.toFixed(1)} MB`;
    };

    const onSelect = (f: File) => {
      if (!f.name.endsWith(".md") && !f.name.endsWith(".txt")) {
        alert("Please upload a .md or .txt file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setMarkdown(text);
        setFile(f);
      };
      reader.readAsText(f);
    };

    return (
      <div className="grid md:grid-cols-2 gap-6">
        {/* Option 1: Write Markdown */}
        <div className="flex flex-col">
          <label className="mb-2 text-sm font-medium text-slate-300">
            ✍️ Write or Paste Markdown
          </label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Start typing Markdown here..."
            className="flex-1 h-[20rem] p-4 rounded-xl bg-white/[0.02] border border-white/10 text-slate-100 resize-none shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Option 2: Upload File */}
        <div className="flex flex-col">
          <label className="mb-2 text-sm font-medium text-slate-300">
            📂 Or Upload a Markdown File
          </label>

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                inputRef.current?.click();
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onSelect(f);
            }}
            className="h-[20rem] flex items-center justify-center rounded-xl border-2 border-dashed border-white/15 hover:border-purple-400/60 transition-colors bg-white/[0.02] cursor-pointer"
            aria-label="Upload a Markdown file via file dialog or drag & drop"
          >
            {!file ? (
              <span className="text-slate-400 text-sm text-center">
                Drag & drop your .md or .txt file here, or click to browse
              </span>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* File chip */}
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-300"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-sm">
                    <span className="font-medium text-slate-100">{file.name}</span>
                    <span className="text-slate-400"> • {readableSize(file)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="ml-2 rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  File loaded. You can still edit the Markdown text.
                </span>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".md,.txt"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSelect(f);
              }}
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="col-span-2">
          <label className="mb-2 text-sm font-medium text-slate-300">
            👁️ Live Preview
          </label>
          <div className="h-[20rem] rounded-xl bg-white/[0.02] border border-white/10 shadow-inner overflow-y-auto p-4">
            <MarkdownPreview content={markdown} />
          </div>
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = "MarkdownEditor";
export default MarkdownEditor;
