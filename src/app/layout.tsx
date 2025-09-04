import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Free Online File Converters | File Conversion Toolkit",
  description:
    "Free online file conversion toolkit. Convert PDF, Excel, Word, Markdown and Images fast and secure in your browser.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "Free Online File Converters | File Conversion Toolkit",
    description:
      "Convert PDF, Word, Excel, Markdown and Images with our fast and secure online tools.",
    url: "http://localhost:3000",
    siteName: "File Conversion Toolkit",
    images: [
      {
        url: "http://localhost:3000/og-image.png",
        width: 1200,
        height: 630,
        alt: "File Conversion Toolkit",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online File Converters | File Conversion Toolkit",
    description:
      "Convert PDF, Word, Excel, Markdown and Images with our fast and secure online tools.",
    images: ["http://localhost:3000/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "File Conversion Toolkit",
    url: "http://localhost:3000",
    description:
      "Free online file conversion toolkit. Convert PDF, Word, Excel, Markdown and Images with our fast and secure tools.",
    potentialAction: {
      "@type": "SearchAction",
      target: "http://localhost:3000/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    applicationCategory: "FileConverter",
    operatingSystem: "Web",
    softwareAddOn: [
      {
        "@type": "SoftwareApplication",
        name: "Image to PDF Converter",
        url: "http://localhost:3000/image-to-pdf",
        applicationCategory: "FileConverter",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "SoftwareApplication",
        name: "PDF to Image Converter",
        url: "http://localhost:3000/pdf-to-image",
        applicationCategory: "FileConverter",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "SoftwareApplication",
        name: "CSV to Excel Converter",
        url: "http://localhost:3000/csv-to-excel",
        applicationCategory: "FileConverter",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "SoftwareApplication",
        name: "Excel to CSV Converter",
        url: "http://localhost:3000/excel-to-csv",
        applicationCategory: "FileConverter",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "SoftwareApplication",
        name: "Markdown to DOCX Converter",
        url: "http://localhost:3000/marktodoc",
        applicationCategory: "FileConverter",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "SoftwareApplication",
        name: "DOCX to Markdown Converter",
        url: "http://localhost:3000/doctomark",
        applicationCategory: "FileConverter",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
