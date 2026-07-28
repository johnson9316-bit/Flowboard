import { html } from "lit";

export type WorkboardSelectOption<Value extends string = string> = {
  value: Value;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  boardId?: string;
  disabled?: boolean;
};

export function renderWorkboardSelect<Value extends string>(params: {
  value: Value;
  options: readonly WorkboardSelectOption<Value>[];
  label: string;
  onChange: (value: Value) => void;
  requestUpdate?: () => void;
  className?: string;
  showLabel?: boolean;
  disabled?: boolean;
}) {
  const select = html`
    <select
      class="input workboard-select ${params.className ?? ""}"
      aria-label=${params.label}
      .value=${params.value}
      ?disabled=${params.disabled}
      @change=${(event: Event) => {
        const value = (event.currentTarget as HTMLSelectElement).value as Value;
        if (params.options.some((option) => option.value === value && !option.disabled)) {
          params.onChange(value);
          params.requestUpdate?.();
        }
      }}
    >
      ${params.options.map(
        (option) => html`
          <option
            value=${option.value}
            ?selected=${option.value === params.value}
            ?disabled=${option.disabled}
          >
            ${option.label}${option.description ? ` - ${option.description}` : ""}
          </option>
        `,
      )}
    </select>
  `;
  if (params.showLabel === false) {
    return select;
  }
  return html`
    <div class="workboard-field">
      <span>${params.label}</span>
      ${select}
    </div>
  `;
}
