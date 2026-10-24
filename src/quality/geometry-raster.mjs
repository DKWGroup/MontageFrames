// Self-contained so tests exercise this exact code inside Chromium.
export function isolateGeometryElement({ id }) {
  const doc = globalThis.document,
    css = globalThis.getComputedStyle;
  const root = doc.querySelector("[data-quality-root]");
  const issues = [];
  if (!root) return { status: "unknown", issues: ["missing canvas"] };
  root.__mfRestoreGeometry?.();
  const matches = [...root.querySelectorAll("[data-quality-id]")].filter(
    (el) => el.dataset.qualityId === id,
  );
  if (matches.length !== 1)
    return { status: "unknown", issues: ["missing or duplicate target"] };
  const target = matches[0],
    changed = new Map(),
    wrappers = [];
  const remember = (el) => {
    if (!changed.has(el))
      changed.set(el, {
        style: el.getAttribute("style"),
        ancestor: el.getAttribute("data-mf-raster-ancestor"),
      });
  };
  const paintGuardStyle = (s, tag) => {
    if (
      s.mixBlendMode !== "normal" ||
      s.backdropFilter !== "none" ||
      s.backgroundBlendMode !== "normal" ||
      s.animationName !== "none"
    )
      issues.push(`unsupported dependent paint: ${tag}`);
  };
  const paintGuard = (el) => {
    paintGuardStyle(css(el), el.tagName);
    for (const pseudo of ["::before", "::after"]) {
      const p = css(el, pseudo);
      if (!["none", "normal"].includes(p.content))
        paintGuardStyle(p, el.tagName + pseudo);
    }
  };
  const owns = (node) => node.closest("[data-quality-id]") === target;
  const nodes = [target, ...target.querySelectorAll("*")].filter(owns);
  const fingerprint = (el) => {
    const s = css(el),
      r = el.getBoundingClientRect();
    return JSON.stringify({
      style: [...s].map((k) => [k, s.getPropertyValue(k)]),
      pseudos: ["::before", "::after"].map((p) => {
        const v = css(el, p);
        return [...v].map((k) => [k, v.getPropertyValue(k)]);
      }),
      rect: [r.x, r.y, r.width, r.height],
    });
  };
  const before = new Map(nodes.map((el) => [el, fingerprint(el)]));
  for (const el of nodes) paintGuard(el);
  for (const img of target.querySelectorAll("img"))
    if (!img.complete || !img.naturalWidth) issues.push("image not ready");
  const mute = (el) => {
    remember(el);
    el.style.setProperty("opacity", "0", "important");
    // Opacity does not create a compositing group for display:contents.
    if (css(el).display === "contents") {
      el.style.setProperty("visibility", "hidden", "important");
      for (const child of el.children) mute(child);
      for (const pseudo of ["::before", "::after"]) {
        const p = css(el, pseudo);
        if (
          !["none", "normal"].includes(p.content) &&
          p.visibility !== "hidden"
        )
          issues.push("unmuted contents pseudo");
      }
    }
  };
  // Nested decorations stay in layout, but have their own raster request.
  for (const el of target.querySelectorAll("[data-quality-id]")) mute(el);
  for (let n = target.parentElement; n; n = n.parentElement) {
    paintGuard(n);
    remember(n);
    for (const child of [...n.childNodes]) {
      if (child.nodeType === 1 && !child.contains(target)) mute(child);
      else if (child.nodeType === 3 && child.textContent.trim()) {
        const span = doc.createElement("span");
        span.style.setProperty("display", "contents", "important");
        span.style.setProperty("visibility", "hidden", "important");
        child.replaceWith(span);
        span.append(child);
        wrappers.push([span, child]);
      }
    }
    for (const [name, value] of [
      ["background-color", "transparent"],
      ["background-image", "none"],
      ["border-color", "transparent"],
      ["outline-color", "transparent"],
      ["box-shadow", "none"],
    ])
      n.style.setProperty(name, value, "important");
    n.setAttribute("data-mf-raster-ancestor", "");
  }
  const style = doc.createElement("style");
  style.textContent =
    "[data-mf-raster-ancestor]::before,[data-mf-raster-ancestor]::after{visibility:hidden!important}";
  doc.head.append(style);
  for (const el of nodes)
    if (before.get(el) !== fingerprint(el))
      issues.push(`target layout or computed paint changed: ${el.tagName}`);
  const canvas = root.getBoundingClientRect();
  if (canvas.x !== 0 || canvas.y !== 0)
    issues.push("canvas offset is unsupported");
  root.__mfRestoreGeometry = () => {
    style.remove();
    for (const [span, text] of wrappers)
      if (span.isConnected) span.replaceWith(text);
    for (const [el, old] of changed) {
      if (old.style === null) el.removeAttribute("style");
      else el.setAttribute("style", old.style);
      if (old.ancestor === null) el.removeAttribute("data-mf-raster-ancestor");
      else el.setAttribute("data-mf-raster-ancestor", old.ancestor);
    }
    delete root.__mfRestoreGeometry;
  };
  return {
    status: issues.length ? "unknown" : "measured",
    issues: [...new Set(issues)],
    id,
    width: canvas.width,
    height: canvas.height,
  };
}
export function restoreGeometryIsolation() {
  globalThis.document
    .querySelector("[data-quality-root]")
    ?.__mfRestoreGeometry?.();
}
