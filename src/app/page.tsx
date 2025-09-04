import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1500px_800px_at_10%_-10%,#c7d2fe30,transparent_60%),radial-gradient(1200px_600px_at_100%_10%,#e0e7ff24,transparent_55%),linear-gradient(180deg,#0b1020_0%,#0a0f19_60%)] text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <section className="text-center mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-slate-300">
            <Dot /> Fast, modern & secure
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
            Free Online File Conversion Toolkit
          </h1>
          <p className="mt-3 text-lg text-slate-300/90">
            Convert PDF, Word, Excel, Markdown and Images with our simple,
            secure and reliable tools — all in your browser.
          </p>
        </section>

        {/* PDF Tools */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">📄 PDF Tools</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              href="/image-to-pdf"
              title="Image to PDF"
              description="Combine PNG/JPG/WebP into a crisp multi-page PDF — drag, reorder, convert."
              icon={<ImageStackIcon />}
            />
            <ToolCard
              href="/pdf-to-image"
              title="PDF to Image"
              description="Turn each page into a clean PNG and download them all in a single ZIP."
              icon={<PdfPageIcon />}
            />
            <ToolCard
              href="/pdf-sign"
              title="Sign a PDF"
              description="Type your signature, drag it onto pages, and download instantly."
              icon={<PdfPageIcon />}
            />
          </div>
        </section>

        {/* Spreadsheet Tools */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">📊 Spreadsheet Tools</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              href="/csv-to-excel"
              title="CSV to Excel"
              description="Easily convert CSV files into clean, structured Excel spreadsheets."
              icon={<TableIcon />}
            />
            <ToolCard
              href="/excel-to-csv"
              title="Excel to CSV"
              description="Export your Excel data as lightweight, universal CSV files."
              icon={<TableIcon />}
            />
          </div>
        </section>

        {/* Markdown & Docs Tools */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">📝 Markdown & Docs Tools</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              href="/mark-to-doc"
              title="Markdown to DOCX"
              description="Convert your Markdown files or text into polished Word documents."
              icon={<DocIcon />}
            />
            <ToolCard
              href="/doc-to-mark"
              title="DOCX to Markdown"
              description="Extract clean Markdown from Word files with live preview."
              icon={<DocIcon />}
            />
          </div>
        </section>

        {/* Features */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3 text-sm">
          <FeatureCard
            title="SSR by default"
            desc="Next.js App Router pages render fast and are SEO friendly."
          />
          <FeatureCard
            title="Secure & ephemeral"
            desc="Processed in memory and not persisted on the server."
          />
          <FeatureCard
            title="Accessible UI"
            desc="Keyboard-friendly, high-contrast, and screen-reader considerate."
          />
        </section>

        {/* Footer note */}
        <p className="mt-10 text-center text-xs text-slate-400">
          We process your files in memory solely to perform conversions and
          return results. No files are stored.
        </p>
      </div>
    </div>
  );
}

function ToolCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block focus:outline-none">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.35)] p-6 sm:p-8 transition-transform duration-200 group-hover:scale-[1.01]">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-400/30 text-indigo-300">
          {icon}
        </div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-slate-300/90">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 text-indigo-300">
          <span className="text-sm">Open</span>
          <ArrowRight />
        </div>
      </div>
    </Link>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-slate-200 font-medium">{title}</div>
      <div className="mt-1 text-slate-400">{desc}</div>
    </div>
  );
}

/* Icons */
function ArrowRight() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-80"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function Dot() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-emerald-400"
    >
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

function ImageStackIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="14" rx="2" ry="2" />
      <path d="m10 13 2-2 3 3 2-2 2 2" />
      <path d="M3 17h18" />
    </svg>
  );
}

function PdfPageIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <rect x="8" y="13" width="8" height="5" rx="1" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}
