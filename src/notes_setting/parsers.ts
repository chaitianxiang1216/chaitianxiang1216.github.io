const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeUrl = (value: string): string => {
  const url = value.trim();
  return /^(https?:|mailto:)/i.test(url) ? escapeHtml(url) : "#";
};

const renderInlineMarkdown = (value: string): string =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) =>
      `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`,
    );

export const markdownToHtml = (content: string): string => {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let listTag: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  let codeLines: string[] | null = null;

  const closeList = () => {
    if (listTag) {
      output.push(`</${listTag}>`);
      listTag = null;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      output.push(`<p>${paragraph.join("<br>")}</p>`);
      paragraph = [];
    }
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```/);
    if (fence) {
      flushParagraph();
      closeList();

      if (codeLines) {
        output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = null;
      } else {
        codeLines = [];
      }
      continue;
    }

    if (codeLines) {
      codeLines.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeList();
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushParagraph();
      closeList();
      output.push("<hr>");
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const blockquote = line.match(/^\s*>\s?(.*)$/);
    if (blockquote) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${renderInlineMarkdown(blockquote[1])}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.*)$/);
    if (unordered) {
      flushParagraph();
      if (listTag !== "ul") {
        closeList();
        output.push("<ul>");
        listTag = "ul";
      }
      output.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (listTag !== "ol") {
        closeList();
        output.push("<ol>");
        listTag = "ol";
      }
      output.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(renderInlineMarkdown(line));
  }

  if (codeLines) {
    output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  closeList();

  return output.join("\n");
};

const renderPlainHtmlNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (!(node instanceof Element)) {
    return "";
  }

  const tag = node.tagName.toLowerCase();
  if (tag === "script" || tag === "style") {
    return "";
  }
  if (tag === "br") {
    return "\n";
  }

  const content = Array.from(node.childNodes).map(renderPlainHtmlNode).join("");

  if (tag === "li") {
    return `• ${content.trim()}\n`;
  }

  if (
    /^(p|div|h[1-6]|blockquote|pre|ul|ol|table|tr|section|article)$/.test(tag)
  ) {
    return `${content.trim()}\n`;
  }

  return content;
};

export const htmlToPlainText = (content: string): string => {
  const document = new DOMParser().parseFromString(content, "text/html");
  return Array.from(document.body.childNodes)
    .map(renderPlainHtmlNode)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const markdownToPlainText = (content: string): string =>
  htmlToPlainText(markdownToHtml(content));
const SANITIZED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

export const htmlToSafeHtml = (content: string): string => {
  const document = new DOMParser().parseFromString(content, "text/html");
  document
    .querySelectorAll("script,style,iframe,object,embed,form,input,button,link,meta")
    .forEach((node) => node.remove());

  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    const tag = element.tagName.toLowerCase();

    if (!SANITIZED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if ((name === "href" || name === "src") && !/^(https?:|data:image\/)/i.test(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }

    if (tag === "a") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
  }

  return document.body.innerHTML;
};

export const plainTextToHtml = (content: string): string =>
  `<pre class="note-plain">${escapeHtml(content)}</pre>`;