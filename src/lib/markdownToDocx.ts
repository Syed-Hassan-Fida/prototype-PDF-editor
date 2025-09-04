// @ts-nocheck
import {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    TextRun,
    AlignmentType,
    ImageRun,
    ExternalHyperlink,
    Table,
    TableRow,
    TableCell,
    WidthType,
} from "docx";
import { marked } from "marked";
import katex from "katex";
import mermaid from "mermaid";
import sharp from "sharp";
import { parseDocument, Element, Node } from "htmlparser2";

// Footnotes collector
const footnotes: { label: string; text: string }[] = [];

// ---------------- Fetch image ----------------
async function fetchImage(url: string): Promise<Buffer | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.error("fetchImage error:", e);
        return null;
    }
}

// ---------------- SVG → PNG via Sharp ----------------
async function svgToPngBuffer(svg: string, width = 600): Promise<Buffer> {
    try {
        return await sharp(Buffer.from(svg))
            .resize({ width })
            .png()
            .toBuffer();
    } catch (e) {
        console.error("svgToPngBuffer error:", e);
        return Buffer.from([]);
    }
}

// ---------------- Render KaTeX ----------------
async function renderMathToImage(latex: string, display = true): Promise<Buffer> {
    try {
        const svg = katex.renderToString(latex, { throwOnError: false, displayMode: display });
        return await svgToPngBuffer(svg, display ? 600 : 180);
    } catch (e) {
        console.error("renderMathToImage error:", e);
        return Buffer.from([]);
    }
}

// ---------------- Render Mermaid ----------------
async function renderMermaidToImage(code: string): Promise<Buffer> {
    try {
        const id = "mmd" + Math.floor(Math.random() * 1000000);
        let svg = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((mermaid as any).render) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            svg = (mermaid as any).render(id, code);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((mermaid as any).mermaidAPI?.render) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            svg = (mermaid as any).mermaidAPI.render(id, code);
        } else {
            svg = `<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">Mermaid render failed</text></svg>`;
        }
        return await svgToPngBuffer(svg, 600);
    } catch (e) {
        console.error("renderMermaidToImage error:", e);
        return Buffer.from([]);
    }
}

// ---------------- HTML helper functions ----------------
function parseStyleString(style: string | undefined): Record<string, string> {
    const map: Record<string, string> = {};
    if (!style) return map;
    style.split(";").forEach((chunk) => {
        const [k, v] = chunk.split(":").map((s) => s?.trim());
        if (k && v) map[k.toLowerCase()] = v;
    });
    return map;
}

// function mapTextAlign(val?: string): AlignmentType | undefined {
//     if (!val) return undefined;
//     const v = val.toLowerCase();
//     if (v === "center") return AlignmentType.CENTER;
//     if (v === "right") return AlignmentType.RIGHT;
//     if (v === "justify") return AlignmentType.JUSTIFIED;
//     return AlignmentType.LEFT;
// }

function styleToTextRunOptions(styleMap: Record<string, string>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = {};
    if (styleMap["color"]) {
        let color = styleMap["color"].replace(/\s/g, "");
        if (color.startsWith("#")) color = color.slice(1);
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
            opts.color = `${r}${g}${b}`;
        } else {
            opts.color = color;
        }
    }
    if (styleMap["font-weight"]) {
        const fw = styleMap["font-weight"].toLowerCase();
        if (fw === "bold" || parseInt(fw) >= 600) opts.bold = true;
    }
    if (styleMap["font-style"] === "italic") opts.italics = true;
    if (styleMap["text-decoration"]?.includes("underline")) opts.underline = {};
    return opts;
}

// ---------------- Parse HTML ----------------
export async function parseInlineHtml(html: string): Promise<(Paragraph | Table)[]> {
    const doc = parseDocument(html);
    const outParagraphs: (Paragraph | Table)[] = [];

    async function walkNodes(nodes: Node[], styleStack: Record<string, string>[] = []): Promise<(TextRun | ImageRun | ExternalHyperlink)[]> {
        const runs: (TextRun | ImageRun | ExternalHyperlink)[] = [];

        for (const node of nodes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((node as any).type === "text") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const text = (node as any).data as string;
                const currentStyle = Object.assign({}, ...styleStack);
                const opts = styleToTextRunOptions(currentStyle);
                runs.push(new TextRun(Object.assign({ text }, opts)));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((node as any).type === "tag") {
                
                const elem = node as Element;
                const tag = elem.tagName.toLowerCase();
                const attrs = elem.attribs || {};
                const styleMap = parseStyleString(attrs["style"]);
                styleStack.push(styleMap);

                if (tag === "strong" || tag === "b") {
                    const inner = await walkNodes(elem.childNodes, styleStack);
                    inner.forEach((r) => { if (r instanceof TextRun) r.bold = true; });
                    runs.push(...inner);
                } else if (tag === "em" || tag === "i") {
                    const inner = await walkNodes(elem.childNodes, styleStack);
                    inner.forEach((r) => { if (r instanceof TextRun) r.italics = true; });
                    runs.push(...inner);
                } else if (tag === "a") {
                    const href = attrs["href"] || "";
                    const innerTextRuns = await walkNodes(elem.childNodes, styleStack);
                    const trChildren = innerTextRuns.map((r) => (r instanceof TextRun ? r : new TextRun({ text: "" })));
                    runs.push(new ExternalHyperlink({ children: trChildren, link: href }));
                } else if (tag === "img") {
                    const src = attrs["src"] || attrs["data-src"] || "";
                    if (src) {
                        const buf = await fetchImage(src);
                        if (buf) runs.push(new ImageRun({ data: buf, transformation: { width: 300, height: 200 } }));
                        else runs.push(new TextRun(attrs["alt"] || "[image]"));
                    }
                } else {
                    const inner = await walkNodes(elem.childNodes, styleStack);
                    runs.push(...inner);
                }

                styleStack.pop();
            }
        }
        return runs;
    }

    // top-level nodes
    const topNodes = doc.childNodes || [];
    for (const node of topNodes) {
        const runs = await walkNodes([node]);
        if (runs.length > 0) outParagraphs.push(new Paragraph({ children: runs }));
    }

    return outParagraphs;
}

// ---------------- Parse Markdown ----------------
async function parseInline(tokens: any[]): Promise<(TextRun | ImageRun | ExternalHyperlink)[]> {
    const runs: (TextRun | ImageRun | ExternalHyperlink)[] = [];

    for (const t of tokens) {
        if (t.type === "text") {
            const mathRegex = /\$(.+?)\$/g;
            let match: RegExpExecArray | null;
            let lastIndex = 0;
            while ((match = mathRegex.exec(t.text)) !== null) {
                if (match.index > lastIndex) runs.push(new TextRun(t.text.slice(lastIndex, match.index)));
                const imgBuffer = await renderMathToImage(match[1], false);
                if (imgBuffer.length > 0) runs.push(new ImageRun({ data: imgBuffer, transformation: { width: 140, height: 40 } }));
                else runs.push(new TextRun(match[0]));
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < t.text.length) runs.push(new TextRun(t.text.slice(lastIndex)));
        } else if (t.type === "strong") {
            runs.push(new TextRun({ text: t.text, bold: true }));
        } else if (t.type === "em") {
            runs.push(new TextRun({ text: t.text, italics: true }));
        } else if (t.type === "codespan") {
            runs.push(new TextRun({ text: t.text, font: "Courier New", highlight: "yellow" }));
        } else if (t.type === "link") {
            runs.push(new ExternalHyperlink({ children: [new TextRun({ text: t.text, style: "Hyperlink" })], link: t.href }));
        } else if (t.type === "image") {
            const imgBuffer = await fetchImage(t.href);
            if (imgBuffer) runs.push(new ImageRun({ data: imgBuffer, transformation: { width: 300, height: 200 } }));
        } else if (t.type === "code" && t.lang === "math") {
            const imgBuffer = await renderMathToImage(t.text, true);
            runs.push(new ImageRun({ data: imgBuffer, transformation: { width: 500, height: 120 } }));
        } else if (t.type === "code" && t.lang === "mermaid") {
            const imgBuffer = await renderMermaidToImage(t.text);
            runs.push(new ImageRun({ data: imgBuffer, transformation: { width: 600, height: 400 } }));
        } else if (t.type === "footnote") {
            runs.push(new TextRun({ text: ` [${t.label}] `, superscript: true }));
            footnotes.push({ label: t.label || `${footnotes.length + 1}`, text: t.text || "" });
        }
    }

    return runs;
}

async function parseMarkdownToDocx(markdown: string): Promise<(Paragraph | Table)[]> {
    const tokens = marked.lexer(markdown, { gfm: true, breaks: false });
    const out: (Paragraph | Table)[] = [];

    for (const token of tokens) {
        switch (token.type) {
            case "heading": {
                const depth = token.depth || 1;
                const heading =
                    depth === 1 ? HeadingLevel.HEADING_1 :
                        depth === 2 ? HeadingLevel.HEADING_2 :
                            depth === 3 ? HeadingLevel.HEADING_3 :
                                depth === 4 ? HeadingLevel.HEADING_4 :
                                    depth === 5 ? HeadingLevel.HEADING_5 :
                                        HeadingLevel.HEADING_6;
                out.push(new Paragraph({ text: token.text, heading }));
                break;
            }
            case "paragraph": {
                const children = await parseInline(token.tokens || []);
                out.push(new Paragraph({ children }));
                break;
            }
            case "list": {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                token.items.forEach((item: any) => {
                    const text = item.text || "";
                    out.push(new Paragraph({
                        children: [new TextRun(text)],
                        bullet: !token.ordered ? { level: 0 } : undefined,
                        numbering: token.ordered ? { reference: "numbered-list", level: 0 } : undefined
                    }));
                });
                break;
            }
            case "code": {
                if (token.lang === "math") {
                    const imgBuffer = await renderMathToImage(token.text, true);
                    out.push(new Paragraph({ children: [new ImageRun({ data: imgBuffer, transformation: { width: 500, height: 120 } })] }));
                } else if (token.lang === "mermaid") {
                    const imgBuffer = await renderMermaidToImage(token.text);
                    out.push(new Paragraph({ children: [new ImageRun({ data: imgBuffer, transformation: { width: 600, height: 400 } })] }));
                } else {
                    out.push(new Paragraph({ children: [new TextRun({ text: token.text, font: "Courier New", size: 22 })] }));
                }
                break;
            }
            case "html": {
                const paras = await parseInlineHtml(token.text || "");
                out.push(...paras);
                break;
            }
            case "hr":
                out.push(new Paragraph({ border: { bottom: { size: 6, color: "000000" } } }));
                break;
            case "table": {
                const headerCells = token.header.map((h: string) =>
                    new TableCell({
                        children: [new Paragraph({ text: h, bold: true })],
                        width: { size: 5000 / token.header.length, type: WidthType.DXA },
                    })
                );
                const headerRow = new TableRow({ children: headerCells });
            
                const bodyRows = token.rows.map((row: string[]) => {
                    const cells = row.map((cell) =>
                        new TableCell({
                            children: [new Paragraph(cell)],
                            width: { size: 5000 / row.length, type: WidthType.DXA },
                        })
                    );
                    return new TableRow({ children: cells });
                });
            
                out.push(
                    new Table({
                        rows: [headerRow, ...bodyRows],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    })
                );
                break;
            }
                
        }
    }

    // append footnotes
    if (footnotes.length > 0) {
        out.push(new Paragraph({ text: "Footnotes", heading: HeadingLevel.HEADING_2 }));
        for (const fn of footnotes) {
            out.push(new Paragraph({ children: [new TextRun({ text: `[${fn.label}] `, bold: true }), new TextRun(fn.text)] }));
        }
    }

    return out;
}

// ---------------- Public API ----------------
export async function markdownToDoc(markdown: string): Promise<Buffer> {
    footnotes.length = 0;
    const children = await parseMarkdownToDocx(markdown);

    const doc = new Document({
        numbering: {
            config: [
                {
                    reference: "numbered-list",
                    levels: [
                        { level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START },
                        { level: 1, format: "decimal", text: "%1.%2.", alignment: AlignmentType.START },
                    ],
                },
            ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sections: [{ properties: {}, children: children as any }],
    });

    return await Packer.toBuffer(doc);
}
