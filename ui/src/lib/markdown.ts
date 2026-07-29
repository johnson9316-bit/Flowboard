import DOMPurify from "dompurify";
import { marked } from "marked";
import TurndownService from "turndown";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

function sanitizedMarkdownHtml(content: string): string {
  const rendered = marked.parse(content, {
    async: false,
    breaks: false,
    gfm: true,
  }) as string;
  return DOMPurify.sanitize(rendered, {
    FORBID_TAGS: ["button", "form", "iframe", "img", "input", "script", "style"],
    USE_PROFILES: { html: true },
  });
}

export function flowboardMarkdownToEditorHtml(content: string): string {
  return sanitizedMarkdownHtml(content);
}

export function flowboardEditorHtmlToMarkdown(content: string): string {
  const turndown = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    headingStyle: "atx",
  });
  return turndown
    .turndown(
      DOMPurify.sanitize(content, {
        FORBID_TAGS: ["button", "form", "iframe", "img", "input", "script", "style"],
        USE_PROFILES: { html: true },
      }),
    )
    .trimEnd();
}

export function renderFlowboardMarkdown(content: string) {
  return unsafeHTML(sanitizedMarkdownHtml(content));
}
