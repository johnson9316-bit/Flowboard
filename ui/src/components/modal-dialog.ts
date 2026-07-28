class OpenClawModalDialog extends HTMLElement {
  connectedCallback() {
    this.setAttribute("role", "dialog");
    this.setAttribute("aria-modal", "true");
    this.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.dispatchEvent(new CustomEvent("modal-cancel", { bubbles: true, cancelable: true }));
      }
    });
  }
}

if (!customElements.get("openclaw-modal-dialog")) {
  customElements.define("openclaw-modal-dialog", OpenClawModalDialog);
}
