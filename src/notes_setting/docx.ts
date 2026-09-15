import { htmlToPlainText } from "./parsers";

const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
};

const findEndOfCentralDirectory = (view: DataView): number => {
  const minimumOffset = Math.max(0, view.byteLength - 0xffff - 22);

  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }

  return -1;
};

const readZipEntries = (buffer: ArrayBuffer): ZipEntry[] => {
  const view = new DataView(buffer);
  const endOffset = findEndOfCentralDirectory(view);

  if (endOffset < 0) {
    throw new Error("Invalid DOCX file: ZIP directory not found.");
  }

  const entryCount = view.getUint16(endOffset + 10, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let offset = view.getUint32(endOffset + 16, true);

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("Invalid DOCX file: malformed ZIP entry.");
    }

    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraFieldLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const name = decoder.decode(nameBytes).replace(/\\/g, "/");

    entries.push({ name, compressionMethod, compressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraFieldLength + commentLength;
  }

  return entries;
};

const inflateRaw = async (data: Uint8Array): Promise<Uint8Array> => {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress DOCX files.");
  }

  const compressedBuffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  const stream = new Blob([compressedBuffer])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const readZipEntry = async (buffer: ArrayBuffer, entry: ZipEntry): Promise<Uint8Array> => {
  const view = new DataView(buffer);

  if (view.getUint32(entry.localHeaderOffset, true) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error("Invalid DOCX file: local ZIP header not found.");
  }

  const fileNameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const extraFieldLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const dataOffset = entry.localHeaderOffset + 30 + fileNameLength + extraFieldLength;
  const compressed = new Uint8Array(buffer, dataOffset, entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressed;
  }

  if (entry.compressionMethod === 8) {
    return inflateRaw(compressed);
  }

  throw new Error(`Unsupported DOCX compression method: ${entry.compressionMethod}.`);
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type RunStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  sizePt?: number;
  color?: string;
};

type ResolvedStyle = {
  tag?: string;
  align?: string;
  list?: boolean;
  run: RunStyle;
};

type RawStyle = {
  name?: string;
  basedOn?: string;
  tag?: string;
  align?: string;
  list?: boolean;
  run: RunStyle;
};

const getWordElements = (parent: Element, localName: string): Element[] =>
  Array.from(parent.getElementsByTagNameNS(WORD_NAMESPACE, localName));

const getDirectWordChild = (parent: Element, localName: string): Element | undefined =>
  Array.from(parent.children).find((child) => child.localName === localName);

const getWordAttribute = (element: Element | undefined, name: string): string =>
  element?.getAttributeNS(WORD_NAMESPACE, name) ??
  element?.getAttribute(`w:${name}`) ??
  "";

const isOn = (element: Element | undefined): boolean => {
  if (!element) {
    return false;
  }

  const value = getWordAttribute(element, "val").toLowerCase();
  return value !== "0" && value !== "false" && value !== "off";
};

const parseRunStyle = (properties: Element | undefined): RunStyle => {
  if (!properties) {
    return {};
  }

  const style: RunStyle = {};
  const bold = getDirectWordChild(properties, "b");
  const italic = getDirectWordChild(properties, "i");
  const underline = getDirectWordChild(properties, "u");
  const strike = getDirectWordChild(properties, "strike");
  const size = getWordAttribute(getDirectWordChild(properties, "sz"), "val");
  const color = getWordAttribute(getDirectWordChild(properties, "color"), "val");

  if (bold) {
    style.bold = isOn(bold);
  }
  if (italic) {
    style.italic = isOn(italic);
  }
  if (underline) {
    style.underline = getWordAttribute(underline, "val").toLowerCase() !== "none";
  }
  if (strike) {
    style.strike = isOn(strike);
  }
  if (size) {
    const points = Number.parseFloat(size) / 2;
    if (Number.isFinite(points)) {
      style.sizePt = points;
    }
  }
  if (/^[0-9a-f]{6}$/i.test(color)) {
    style.color = `#${color}`;
  }

  return style;
};

const getRunStyle = (run: Element, inherited: RunStyle): string => {
  const runProperties = getDirectWordChild(run, "rPr");
  const style = { ...inherited, ...parseRunStyle(runProperties) };
  const styles: string[] = [];

  if (style.bold) {
    styles.push("font-weight:700");
  }
  if (style.italic) {
    styles.push("font-style:italic");
  }
  if (style.underline || style.strike) {
    const decorations = [];
    if (style.underline) decorations.push("underline");
    if (style.strike) decorations.push("line-through");
    styles.push(`text-decoration:${decorations.join(" ")}`);
  }
  if (style.sizePt) {
    styles.push(`font-size:${style.sizePt}pt`);
  }
  if (style.color) {
    styles.push(`color:${style.color}`);
  }

  return styles.join(";");
};

const extractRunText = (run: Element): string => {
  let text = "";

  for (const node of Array.from(run.getElementsByTagName("*"))) {
    switch (node.localName) {
      case "t":
        text += escapeHtml(node.textContent ?? "");
        break;
      case "tab":
        text += "&emsp;";
        break;
      case "br":
      case "cr":
        text += "<br>";
        break;
      default:
        break;
    }
  }

  return text;
};

const readRawStyles = (stylesDocument: Document | undefined): Map<string, RawStyle> => {
  const styles = new Map<string, RawStyle>();
  if (!stylesDocument) {
    return styles;
  }

  for (const styleElement of getWordElements(stylesDocument.documentElement, "style")) {
    const id = getWordAttribute(styleElement, "styleId");
    if (!id) {
      continue;
    }

    const name = getWordAttribute(getDirectWordChild(styleElement, "name"), "val");
    const basedOn = getWordAttribute(getDirectWordChild(styleElement, "basedOn"), "val");
    const paragraphProperties = getDirectWordChild(styleElement, "pPr");
    const runProperties = getDirectWordChild(styleElement, "rPr");
    const outlineLevel = getWordAttribute(
      getDirectWordChild(paragraphProperties ?? styleElement, "outlineLvl"),
      "val",
    );
    const headingMatch = /^heading\s*([1-6])$/i.exec(name);
    const tag = headingMatch
      ? `h${headingMatch[1]}`
      : outlineLevel && Number(outlineLevel) < 6
        ? `h${Number(outlineLevel) + 1}`
        : undefined;

    styles.set(id, {
      name,
      basedOn: basedOn || undefined,
      tag,
      align: getWordAttribute(getDirectWordChild(paragraphProperties ?? styleElement, "jc"), "val") || undefined,
      list: Boolean(getDirectWordChild(paragraphProperties ?? styleElement, "numPr")),
      run: parseRunStyle(runProperties),
    });
  }

  return styles;
};

const resolveStyle = (
  id: string,
  styles: Map<string, RawStyle>,
  seen = new Set<string>(),
): ResolvedStyle => {
  if (!id || seen.has(id)) {
    return { run: {} };
  }

  const rawStyle = styles.get(id);
  if (!rawStyle) {
    return { run: {} };
  }

  seen.add(id);
  const base = rawStyle.basedOn
    ? resolveStyle(rawStyle.basedOn, styles, seen)
    : { run: {} };

  return {
    tag: rawStyle.tag ?? base.tag,
    align: rawStyle.align ?? base.align,
    list: rawStyle.list ?? base.list,
    run: { ...base.run, ...rawStyle.run },
  };
};

const renderDocxParagraph = (
  paragraph: Element,
  styles: Map<string, RawStyle>,
): string => {
  const paragraphProperties = getDirectWordChild(paragraph, "pPr");
  const styleId = getWordAttribute(
    getDirectWordChild(paragraphProperties ?? paragraph, "pStyle"),
    "val",
  );
  const resolvedStyle = resolveStyle(styleId, styles);
  const alignment =
    getWordAttribute(getDirectWordChild(paragraphProperties ?? paragraph, "jc"), "val") ||
    resolvedStyle.align;
  const isList =
    Boolean(getDirectWordChild(paragraphProperties ?? paragraph, "numPr")) ||
    Boolean(resolvedStyle.list);
  const tag = resolvedStyle.tag ?? "p";
  const stylesList: string[] = [];

  if (alignment === "center") {
    stylesList.push("text-align:center");
  } else if (alignment === "right" || alignment === "end") {
    stylesList.push("text-align:right");
  } else if (alignment === "both" || alignment === "justify") {
    stylesList.push("text-align:justify");
  }

  const runs = getWordElements(paragraph, "r");
  const content = runs.length > 0
    ? runs.map((run) => {
        const text = extractRunText(run);
        const style = getRunStyle(run, resolvedStyle.run);
        return style ? `<span style="${style}">${text}</span>` : text;
      }).join("")
    : escapeHtml(paragraph.textContent ?? "");

  const tagName = isList ? "div" : tag;
  const listStyle = isList ? "display:list-item;margin-left:1.5em" : "";
  const style = [...stylesList, listStyle].filter(Boolean).join(";");
  const styleAttribute = style ? ` style="${style}"` : "";

  return `<${tagName}${styleAttribute}>${content}</${tagName}>`;
};

export const extractDocxHtml = async (buffer: ArrayBuffer): Promise<string> => {
  const entries = readZipEntries(buffer);
  const documentEntry = entries.find(
    (entry) => entry.name.toLowerCase() === "word/document.xml",
  );

  if (!documentEntry) {
    throw new Error("Invalid DOCX file: word/document.xml not found.");
  }

  const stylesEntry = entries.find(
    (entry) => entry.name.toLowerCase() === "word/styles.xml",
  );
  const xmlBytes = await readZipEntry(buffer, documentEntry);
  const xml = new TextDecoder("utf-8").decode(xmlBytes);
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const stylesDocument = stylesEntry
    ? new DOMParser().parseFromString(
        new TextDecoder("utf-8").decode(await readZipEntry(buffer, stylesEntry)),
        "application/xml",
      )
    : undefined;
  const styles = readRawStyles(stylesDocument);
  const paragraphs = getWordElements(document.documentElement, "p");

  if (paragraphs.length === 0) {
    const text = escapeHtml(document.documentElement.textContent ?? "");
    return text ? `<p>${text}</p>` : "";
  }

  return paragraphs.map((paragraph) => renderDocxParagraph(paragraph, styles)).join("\n");
};
export const extractDocxText = async (buffer: ArrayBuffer): Promise<string> =>
  htmlToPlainText(await extractDocxHtml(buffer));