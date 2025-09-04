"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export default function FileDropzone({ onFileAccepted }: { onFileAccepted: (file: File) => void }) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? "border-green-400 bg-gray-800" : "border-gray-600 hover:border-gray-400"
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-green-400 font-medium">Drop the DOCX file here...</p>
      ) : (
        <p className="text-gray-300">Drag & drop a DOCX file here, or click to select</p>
      )}
    </div>
  );
}
