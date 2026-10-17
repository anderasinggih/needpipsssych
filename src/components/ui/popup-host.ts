/* Popup host: where a component's popups (modals, dropdowns, tooltips) live, and how to place
   them there (his call, 2026-10-02: "make sure modals and dropdowns do not open outside the
   component area").

   A page that draws a component inside its own box (the library's Browse all card, which also
   scales it) marks that box with `data-popup-root`. The box is a containing block (`contain:
   layout`) and clips, so a popup portalled into it, or `fixed` inside it, stays in the card.
   Anywhere else (a detail page's frame, a buyer's app) the host is the element's own document
   body and nothing changes.

   popupHost(el)     the nearest [data-popup-root] above `el`, else el.ownerDocument.body
   toHost(rect, h)   a viewport rect (getBoundingClientRect) in the coordinates a `fixed` popup
                     inside `h` uses: relative to the host box, in its unscaled units
   hostSize(h)       the room a popup has: the host box's size, else the window's
   hostView(h)       the room that shows, in the same units: the box of the host's nearest
                     clipping ancestor (the card's frame; the host itself is the 960px stage,
                     wider than the card, and does not clip), else the window. Flip and clamp
                     a dropdown against this.
   scrimStyle(h)     for a `fixed inset-0` overlay: the style that pins it to hostView, so the
                     dialog centres in the card that shows; undefined (no change) outside a root */

export function popupHost(el: Element | null | undefined): HTMLElement | null {
  if (!el) return null
  return (el.closest("[data-popup-root]") as HTMLElement | null) ?? el.ownerDocument.body
}

const isRoot = (h: HTMLElement | null | undefined): h is HTMLElement => !!h && h.hasAttribute("data-popup-root")

export function toHost(r: DOMRect, host: HTMLElement | null | undefined) {
  if (!isRoot(host)) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  const hr = host.getBoundingClientRect()
  const s = hr.width / (host.offsetWidth || 1) || 1
  const left = (r.left - hr.left) / s
  const top = (r.top - hr.top) / s
  const width = r.width / s
  const height = r.height / s
  return { left, top, right: left + width, bottom: top + height, width, height }
}

export function hostSize(host: HTMLElement | null | undefined) {
  /* read before the guard: its false branch narrows `host` to never */
  const view = host?.ownerDocument.defaultView ?? window
  if (isRoot(host)) return { width: host.offsetWidth, height: host.offsetHeight }
  return { width: view.innerWidth, height: view.innerHeight }
}

export function hostView(host: HTMLElement | null | undefined) {
  const view = host?.ownerDocument.defaultView ?? window
  if (!isRoot(host)) return { left: 0, top: 0, width: view.innerWidth, height: view.innerHeight }
  /* the host does not clip its fixed popups, so the room is the clipping ancestor's whole box */
  let clip = host.getBoundingClientRect()
  for (let el = host.parentElement; el && el !== host.ownerDocument.body; el = el.parentElement) {
    const cs = view.getComputedStyle(el)
    if (cs.overflowX === "visible" && cs.overflowY === "visible" && !/paint|strict|content/.test(cs.contain)) continue
    clip = el.getBoundingClientRect()
    break
  }
  const v = toHost(clip, host)
  return { left: v.left, top: v.top, width: v.width, height: v.height }
}

export function scrimStyle(host: HTMLElement | null | undefined) {
  if (!isRoot(host)) return undefined
  const v = hostView(host)
  return { left: v.left, top: v.top, width: v.width, height: v.height, right: "auto", bottom: "auto" } as const
}
