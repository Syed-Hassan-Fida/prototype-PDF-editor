import { fromPath } from "pdf2pic";
import { PDFDocument } from "pdf-lib";
import fs from "fs";

export async function PdfToImageConverter(pdfPath: string) {
  // Read the PDF to get total pages
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  // Setup converter
  const converter = fromPath(pdfPath, {
    density: 100,
    saveFilename: "page",
    savePath: "/tmp",
    format: "png",
    width: 800,
    height: 1000,
  });

  const imageBuffers: string[] = [];

  // Convert each page one by one
  for (let i = 1; i <= totalPages; i++) {
    // ✅ ask for base64 explicitly
    const result = await converter(i, { responseType: "base64" });
    imageBuffers.push(`data:image/png;base64,${result.base64}`);
  }

  return imageBuffers;
}
