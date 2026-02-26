export function define(tag: string, elementClass: CustomElementConstructor): void {
  if (customElements.get(tag)) return;
  customElements.define(tag, elementClass);
}
