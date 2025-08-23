// src/lib/imageToPdf.ts
import jsPDF from 'jspdf';

export async function processImagesToPdf(files: File[]) {
  const doc = new jsPDF();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imgData = await readFileAsDataURL(file);
    
    if (i > 0) {
      doc.addPage();
    }
    
    const img = new Image();
    img.src = imgData;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    
    const width = doc.internal.pageSize.getWidth();
    const height = (img.height * width) / img.width;
    
    doc.addImage(imgData, 'JPEG', 0, 0, width, height);
  }
  
  doc.save('converted.pdf');
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}