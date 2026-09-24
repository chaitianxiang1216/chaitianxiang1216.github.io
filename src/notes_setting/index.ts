import { directoryPaths as discoveredDirectories } from "virtual:notes-directories";
import { extractDocxHtml, extractDocxText } from "./docx";
import {
  htmlToPlainText,
  htmlToSafeHtml,
  markdownToHtml,
  markdownToPlainText,
  plainTextToHtml,
} from "./parsers";

type TextNoteFormat = "markdown" | "text" | "html";

type TextNoteDocument = {
  name: string;
  displayName: string;
  kind: "text";
  format: TextNoteFormat;
  content: string;
};

type DocxNoteDocument = {
  name: string;
  displayName: string;
  kind: "docx";
  format: "docx";
  url: string;
};

type PdfNoteDocument = {
  name: string;
  displayName: string;
  kind: "pdf";
  format: "pdf";
  url: string;
};

type LegacyDocNoteDocument = {
  name: string;
  displayName: string;
  kind: "legacy-doc";
  format: "legacy-doc";
  url: string;
};

export type NoteDocument =
  | TextNoteDocument
  | DocxNoteDocument
  | PdfNoteDocument
  | LegacyDocNoteDocument;

const textModules = import.meta.glob("../data/notes/**/*.{md,markdown,txt,text,html}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const docxModules = import.meta.glob("../data/notes/**/*.docx", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const pdfModules = import.meta.glob("../data/notes/**/*.pdf", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const legacyDocModules = import.meta.glob("../data/notes/**/*.doc", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const normalizeName = (path: string) => path.replace(/^\.\.\/data\/notes\//, "");
const getDisplayName = (name: string) => name.replace(/\.[^./]+$/, "");
const getBaseName = (path: string) => path.split("/").pop() ?? path;
const getDirectoryPath = (path: string) => {
  const separator = path.lastIndexOf("/");
  return separator >= 0 ? path.slice(0, separator) : "";
};
const normalizeDirectory = (directory: string) =>
  directory.replace(/^\/+|\/+$/g, "");
const addAncestorDirectories = (directories: Set<string>, path: string) => {
  const parts = path.split("/").filter(Boolean);
  for (let index = 1; index < parts.length; index += 1) {
    directories.add(parts.slice(0, index).join("/"));
  }
};

const getTextFormat = (path: string): TextNoteFormat => {
  const extension = path.split(".").pop()?.toLowerCase();

  if (extension === "md" || extension === "markdown") {
    return "markdown";
  }

  if (extension === "html") {
    return "html";
  }

  return "text";
};

export const notes: NoteDocument[] = [
  ...Object.entries(textModules).map(([path, content]) => {
    const name = normalizeName(path);

    return {
      name,
      displayName: getDisplayName(name),
      kind: "text" as const,
      format: getTextFormat(path),
      content,
    };
  }),
  ...Object.entries(docxModules).map(([path, url]) => {
    const name = normalizeName(path);

    return {
      name,
      displayName: getDisplayName(name),
      kind: "docx" as const,
      format: "docx" as const,
      url,
    };
  }),
  ...Object.entries(pdfModules).map(([path, url]) => {
    const name = normalizeName(path);

    return {
      name,
      displayName: getDisplayName(name),
      kind: "pdf" as const,
      format: "pdf" as const,
      url,
    };
  }),
  ...Object.entries(legacyDocModules).map(([path, url]) => {
    const name = normalizeName(path);

    return {
      name,
      displayName: getDisplayName(name),
      kind: "legacy-doc" as const,
      format: "legacy-doc" as const,
      url,
    };
  }),
].sort((left, right) =>
  left.displayName.localeCompare(right.displayName, "zh-CN", {
    numeric: true,
    sensitivity: "base",
  }),
);

const directoryPaths = (() => {
  const directories = new Set<string>(discoveredDirectories);

  for (const note of notes) {
    const directory = getDirectoryPath(note.name);
    if (directory) {
      directories.add(directory);
      addAncestorDirectories(directories, directory);
    }
  }

  return [...directories].sort((left, right) =>
    left.localeCompare(right, "zh-CN", { numeric: true, sensitivity: "base" }),
  );
})();

export type NoteDirectoryEntry = {
  kind: "directory";
  name: string;
  path: string;
};

export type NoteFileEntry = {
  kind: "file";
  name: string;
  number: number;
  path: string;
  note: NoteDocument;
};

export type NoteDirectoryListing = {
  path: string;
  directories: NoteDirectoryEntry[];
  files: NoteFileEntry[];
};

export const listNoteDirectory = (directory = ""): NoteDirectoryListing => {
  const normalizedDirectory = normalizeDirectory(directory);
  const prefix = normalizedDirectory ? `${normalizedDirectory}/` : "";
  const directories = directoryPaths
    .filter((path) => path.startsWith(prefix) && path !== normalizedDirectory)
    .map((path) => path.slice(prefix.length))
    .filter((path) => path.length > 0 && !path.includes("/"))
    .map((name) => ({
      kind: "directory" as const,
      name,
      path: normalizedDirectory ? `${normalizedDirectory}/${name}` : name,
    }));

  const files = notes
    .filter((note) => {
      const relativePath = note.name.startsWith(prefix)
        ? note.name.slice(prefix.length)
        : "";
      return relativePath.length > 0 && !relativePath.includes("/");
    })
    .sort((left, right) =>
      getBaseName(left.name).localeCompare(getBaseName(right.name), "zh-CN", {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map((note, index) => ({
      kind: "file" as const,
      name: getDisplayName(getBaseName(note.name)),
      number: index + 1,
      path: note.name,
      note,
    }));

  return { path: normalizedDirectory, directories, files };
};

export const resolveNoteDirectory = (
  currentDirectory: string,
  target: string,
): string | undefined => {
  const normalizedTarget = target.trim().replace(/\\/g, "/");

  if (!normalizedTarget || normalizedTarget === "~" || normalizedTarget === "/") {
    return "";
  }

  const parts = normalizedTarget.startsWith("/")
    ? []
    : normalizeDirectory(currentDirectory).split("/").filter(Boolean);

  for (const part of normalizedTarget.replace(/^\/+/, "").split("/")) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  const resolved = parts.join("/");
  return resolved === "" || directoryPaths.includes(resolved) ? resolved : undefined;
};

export const getNoteTitle = (note: NoteDocument): string =>
  getDisplayName(getBaseName(note.name));

export const getNoteByName = (name: string): NoteDocument | undefined => {
  const normalizedName = name.toLowerCase();

  return notes.find(
    (note) =>
      note.name.toLowerCase() === normalizedName ||
      note.displayName.toLowerCase() === normalizedName,
  );
};

export const getNoteByReference = (
  reference: string,
  directory = "",
): NoteDocument | undefined => {
  const normalizedReference = reference.trim();

  if (/^\d+$/.test(normalizedReference)) {
    const index = Number.parseInt(normalizedReference, 10) - 1;
    return listNoteDirectory(directory).files[index]?.note;
  }

  const listing = listNoteDirectory(directory);
  const normalizedName = normalizedReference.toLowerCase();
  const directFile = listing.files.find(
    (entry) =>
      entry.name.toLowerCase() === normalizedName ||
      entry.path.toLowerCase() === normalizedName,
  );

  if (directFile) {
    return directFile.note;
  }

  const combinedPath = normalizedReference.startsWith("/")
    ? normalizedReference.replace(/^\/+/, "")
    : [normalizeDirectory(directory), normalizedReference]
        .filter(Boolean)
        .join("/");

  return notes.find(
    (note) => note.name.toLowerCase() === combinedPath.toLowerCase(),
  );
};

export const readNoteHtml = async (note: NoteDocument): Promise<string> => {
  if (note.kind === "legacy-doc") {
    return '<div class="note-unsupported"><h2>Unsupported document format</h2><p>Legacy .doc files cannot be rendered. Save the file as .docx and try again.</p></div>';
  }

  if (note.kind === "pdf") {
    return `<iframe class="note-pdf" src="${note.url}" title="PDF document"></iframe>`;
  }

  if (note.kind === "docx") {
    const response = await fetch(note.url);
    if (!response.ok) {
      throw new Error(`Unable to load ${note.name}.`);
    }

    return extractDocxHtml(await response.arrayBuffer());
  }

  switch (note.format) {
    case "markdown":
      return markdownToHtml(note.content);
    case "html":
      return htmlToSafeHtml(note.content);
    case "text":
    default:
      return plainTextToHtml(note.content);
  }
};
export const readNoteText = async (note: NoteDocument): Promise<string> => {
  if (note.kind === "legacy-doc") {
    throw new Error("Legacy .doc files are not supported. Save the file as .docx.");
  }

  if (note.kind === "pdf") {
    throw new Error("PDF files are binary. Use `read` to open this document.");
  }

  if (note.kind === "docx") {
    const response = await fetch(note.url);
    if (!response.ok) {
      throw new Error(`Unable to load ${note.name}.`);
    }

    return extractDocxText(await response.arrayBuffer());
  }

  switch (note.format) {
    case "markdown":
      return markdownToPlainText(note.content);
    case "html":
      return htmlToPlainText(note.content);
    case "text":
    default:
      return note.content;
  }
};