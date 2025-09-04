"use client"
import dynamic from "next/dynamic";

// Disable SSR for the PdfSignPage
const PdfSignPage = dynamic(() => import("./PdfSignPage"), { ssr: false });

export default function Page() {
  return <PdfSignPage />;
}
