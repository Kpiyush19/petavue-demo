/**
 * Should the app hide its own sidebar nav?
 *
 * The demo is framed into the product at app1.petavue.com/workflows-v2, which
 * already has its own sidebar. Showing ours too would put two navs side by side
 * and make the embed look bolted on rather than part of the product.
 *
 * `?hide_navbar=1` is the contract Ijas asked for — explicit, and it works in a
 * normal tab too, so the embedded look can be previewed without an iframe.
 * `?hide_navbar=0` forces the nav back on. With no param we fall back to
 * detecting a frame, so an embed that forgets the query string still looks
 * right. `embed` is accepted as an alias.
 */
const PARAMS = ["hide_navbar", "embed"];

export function isEmbedded() {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    for (const name of PARAMS) {
      const v = q.get(name);
      if (v === "1" || v === "true") return true;
      if (v === "0" || v === "false") return false;
    }
    return window.self !== window.top;
  } catch {
    // Reading window.top across origins can throw in some browsers. It only
    // throws when there *is* a cross-origin parent, so that answers the
    // question: we are framed.
    return true;
  }
}
