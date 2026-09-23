// jsdom + DOM shims so mermaid can run outside a browser (dev/test only).
// Usage: import { installDomShims } from './mermaid-dom-shim.mjs';
import { JSDOM } from 'jsdom';

/**
 * globals mermaid touches while parsing/rendering: window, document, DOMParser,
 * SVGElement (getBBox), requestAnimationFrame and constructable stylesheets.
 */
export function installDomShims() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Node = dom.window.Node;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.self = dom.window;
  dom.window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 20 });

  // jsdom lacks constructable stylesheets; mermaid's diagram API uses one to
  // inject its CSS, so provide a no-op stand-in.
  if (!globalThis.CSSStyleSheet) {
    globalThis.CSSStyleSheet = class CSSStyleSheet {
      constructor() {
        this.cssRules = [];
      }
      replaceSync() {}
      replace() {
        return Promise.resolve(this);
      }
      insertRule() {
        return 0;
      }
      deleteRule() {}
    };
  }
  if (!dom.window.document.adoptedStyleSheets) {
    Object.defineProperty(dom.window.document, 'adoptedStyleSheets', {
      value: [],
      writable: true,
      configurable: true
    });
  }
  return dom;
}
