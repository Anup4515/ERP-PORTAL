/**
 * Scroll the first invalid form field into view and focus it.
 *
 * Usage (typical):
 *   if (!validate()) {
 *     scrollToFirstError(["name", "email", "password"], { errors });
 *     return;
 *   }
 *
 * Looks up each key in order against a best-match selector and stops at the
 * first hit. By default it scans `#${key}` then `[name="${key}"]`. Callers can
 * override with `selectorMap` for wrapper-div ids (e.g. logo upload blocks).
 *
 * Use `scroll-mt-24` on the target element's wrapper to offset the 72px fixed
 * header so the field isn't hidden beneath it.
 */

export interface ScrollToFirstErrorOptions {
  /** Errors object. If provided, only keys with a truthy error value are considered. */
  errors?: Record<string, unknown>;
  /** Restrict the DOM search to a specific subtree (useful inside modals). */
  scope?: HTMLElement | Document | null;
  /** Map a key to a custom selector (e.g. { logo: "#field-logo" }). */
  selectorMap?: Record<string, string>;
  /** Scroll behavior. Default "smooth". */
  behavior?: ScrollBehavior;
  /** Focus the element after scrolling. Default true. */
  focus?: boolean;
}

export function scrollToFirstError(
  keysInOrder: string[],
  options: ScrollToFirstErrorOptions = {}
): boolean {
  if (typeof document === "undefined") return false;

  const {
    errors,
    scope = document,
    selectorMap = {},
    behavior = "smooth",
    focus = true,
  } = options;

  const root: Document | HTMLElement = scope ?? document;

  for (const key of keysInOrder) {
    // If an errors object is provided, skip keys that aren't actually in error.
    if (errors && !errors[key]) continue;

    const selector =
      selectorMap[key] ||
      `#${CSS.escape(key)}, [name="${CSS.escape(key)}"]`;
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) continue;

    el.scrollIntoView({ behavior, block: "center" });

    if (
      focus &&
      (el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement)
    ) {
      el.focus({ preventScroll: true });
    }

    return true;
  }

  return false;
}
