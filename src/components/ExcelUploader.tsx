"use client";

import { useRef } from "react";

interface Props {
  onUpload: (file: File) => void;
}

export default function ExcelUploader({ onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="p-6 border-2 border-dashed border-gray-400 rounded-xl text-center">
      <p className="text-white mb-3">Upload your Excel (.xlsx) file</p>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200"
      >
        Select File
      </button>
    </div>
  );
}
