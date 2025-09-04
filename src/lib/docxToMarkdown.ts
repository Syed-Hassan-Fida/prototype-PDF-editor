import mammoth from "mammoth";

export async function docToMarkdown(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}
