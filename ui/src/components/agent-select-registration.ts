type AgentOption = { value: string; label: string; disabled?: boolean };

class OpenClawAgentSelect extends HTMLElement {
  private _options: AgentOption[] = [];
  private _value = "";
  disabled = false;
  onSelect?: (value: string) => void;

  get options(): AgentOption[] {
    return this._options;
  }

  set options(value: AgentOption[]) {
    this._options = Array.isArray(value) ? value : [];
    this.render();
  }

  get value(): string {
    return this._value;
  }

  set value(value: string) {
    this._value = value ?? "";
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    if (!this.isConnected) {
      return;
    }
    const label = this.getAttribute("accessibleLabel") ?? "Agent";
    this.replaceChildren();
    const select = document.createElement("select");
    select.className = "input workboard-agent-select__native";
    select.setAttribute("aria-label", label);
    select.disabled = this.disabled;
    for (const option of this._options) {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      element.disabled = Boolean(option.disabled);
      element.selected = option.value === this._value;
      select.append(element);
    }
    select.addEventListener("change", () => {
      this._value = select.value;
      this.onSelect?.(select.value);
    });
    this.append(select);
  }
}

if (!customElements.get("openclaw-agent-select")) {
  customElements.define("openclaw-agent-select", OpenClawAgentSelect);
}
