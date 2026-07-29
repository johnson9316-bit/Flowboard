import DOMPurify from "dompurify";
import { marked } from "marked";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export function renderFlowboardMarkdown(content: string) {
  const rendered = marked.parse(content, {
    async: false,
    breaks: false,
    gfm: true,
  }) as string;
  return unsafeHTML(
    DOMPurify.sanitize(rendered, {
      FORBID_TAGS: ["button", "form", "iframe", "img", "input", "script", "style"],
      USE_PROFILES: { html: true },
    }),
  );
}
