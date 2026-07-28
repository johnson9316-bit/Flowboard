import { html, type TemplateResult } from "lit";

function icon(name: string): TemplateResult {
  return html`<svg class="workboard-icon" aria-hidden="true" viewBox="0 0 16 16" focusable="false">
    <title>${name}</title>
    <path d="M3 3h10v10H3zM5 8h6M8 5v6"></path>
  </svg>`;
}

export const icons = new Proxy(
  {},
  {
    get(_target, property) {
      return icon(String(property));
    },
  },
) as Record<string, TemplateResult>;
