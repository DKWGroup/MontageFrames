// Self-contained: the same function runs in the composition and the Chromium integration test.
export function collectGeometryFrame({ frame, expected }) {
  const doc = globalThis.document,
    css = globalThis.getComputedStyle;
  const root = doc.querySelector("[data-quality-root]");
  const result = { frame, expected, boxes: [], hidden: [], issues: [] };
  if (!root) {
    result.issues.push("missing canvas");
    return result;
  }
  const canvas = root.getBoundingClientRect();
  if (!canvas.width || !canvas.height) {
    result.issues.push("empty canvas");
    return result;
  }
  const visible = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const s = css(n);
      if (
        s.display === "none" ||
        s.visibility === "hidden" ||
        s.visibility === "collapse" ||
        Number(s.opacity) === 0
      )
        return false;
      if (n === root) break;
    }
    return true;
  };
  const markers = [...root.querySelectorAll("[data-quality-id]")];
  for (const item of expected) {
    const matches = markers.filter(
      (el) =>
        el.dataset.qualityId === item.id &&
        el.dataset.qualityRole === item.role,
    );
    if (matches.length !== 1) {
      result.issues.push(`missing or duplicate ${item.id}`);
      continue;
    }
    const el = matches[0];
    if (!visible(el)) {
      result.hidden.push(item);
      continue;
    }
    const boxes = [];
    const add = (r) => {
      if (r.width > 0 && r.height > 0)
        boxes.push({
          ...item,
          extent: "layout",
          x: (r.left - canvas.left) / canvas.width,
          y: (r.top - canvas.top) / canvas.height,
          width: r.width / canvas.width,
          height: r.height / canvas.height,
        });
    };
    const walk = (node) => {
      if (node.nodeType === 3) {
        if (!node.textContent.trim()) return;
        // Range is a layout box; italic/negative-bearing glyphs and raster effects may extend beyond it.
        result.issues.push(
          `${item.id}: glyph ink not measured (layout bounds)`,
        );
        const range = doc.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) add(r);
        return;
      }
      if (node.nodeType !== 1 || !visible(node)) return;
      // Nested word decorations have their own inventory entry.
      if (node !== el && node.dataset.qualityId) return;
      const s = css(node);
      for (const field of [
        "filter",
        "textShadow",
        "boxShadow",
        "clipPath",
        "maskImage",
      ])
        if (s[field] && s[field] !== "none")
          result.issues.push(`${item.id}: unsupported ${field}`);
      if (
        s.fontStyle !== "normal" ||
        parseFloat(s.webkitTextStrokeWidth) > 0 ||
        s.textDecorationLine !== "none"
      )
        result.issues.push(`${item.id}: unmeasured glyph decoration`);
      for (const pseudo of ["::before", "::after"]) {
        const p = css(node, pseudo);
        if (!["none", "normal", '""', "''"].includes(p.content))
          result.issues.push(`${item.id}: pseudo element`);
      }
      const painted =
        !["rgba(0, 0, 0, 0)", "transparent"].includes(s.backgroundColor) ||
        s.backgroundImage !== "none" ||
        ["Top", "Right", "Bottom", "Left"].some(
          (side) =>
            parseFloat(s[`border${side}Width`]) > 0 &&
            s[`border${side}Style`] !== "none",
        );
      if (painted || ["IMG", "SVG", "CANVAS", "VIDEO"].includes(node.tagName))
        add(node.getBoundingClientRect());
      for (const child of node.childNodes) walk(child);
    };
    walk(el);
    if (!boxes.length) result.issues.push(`${item.id}: no visible bounds`);
    result.boxes.push(...boxes);
  }
  for (const el of markers)
    if (
      !expected.some(
        (i) =>
          i.id === el.dataset.qualityId && i.role === el.dataset.qualityRole,
      ) &&
      visible(el)
    )
      result.issues.push(`unexpected ${el.dataset.qualityId}`);
  result.issues = [...new Set(result.issues)];
  return result;
}
