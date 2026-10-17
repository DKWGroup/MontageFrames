export function parseBrandingHash(hash) {
  if (hash === "#branding" || hash === "#branding/") return { clientId: null };
  if (!hash.startsWith("#branding/")) return null;
  try {
    const clientId = decodeURIComponent(hash.slice(10));
    return /^[a-z0-9][a-z0-9_-]*$/.test(clientId) ? { clientId } : null;
  } catch {
    return null;
  }
}
export function brandingHash(clientId) {
  return clientId ? `#branding/${encodeURIComponent(clientId)}` : "#branding";
}
export function applyBrandSuggestions(profile, suggestions, fields) {
  const result = JSON.parse(JSON.stringify(profile));
  for (const field of fields) {
    const raw = suggestions[field];
    const suggestion =
      raw && typeof raw === "object" && Object.hasOwn(raw, "value")
        ? raw
        : { value: raw };
    if (!suggestion || !Object.hasOwn(suggestion, "value")) continue;
    if (
      [
        "name",
        "businessDescription",
        "audience",
        "tone",
        "notes",
        "websiteUrl",
      ].includes(field) &&
      typeof suggestion.value === "string"
    )
      result[field] = suggestion.value;
    if (field === "palette" && Array.isArray(suggestion.value)) {
      const colors = suggestion.value
        .map((color, index) =>
          typeof color === "string"
            ? {
                id: `scan-${index}`,
                hex: color,
                role: index === 0 ? "accent" : "secondary",
              }
            : { ...color, id: `scan-${index}` },
        )
        .filter((color) => color && /^#[a-f0-9]{6}$/i.test(color.hex));
      result.palette.colors = colors.slice(0, result.palette.maxColors);
    }
  }
  return result;
}
export function brandingSaveFailure(draft, revision, status) {
  return { draft, revision, conflict: status === 409 };
}

export function selectBrandStyle(profile, styleId, established) {
  if (styleId === "brand") return { ...profile, styleId };
  if (!established || established.styleId !== styleId) return profile;
  return {
    ...profile,
    styleId,
    palette: JSON.parse(JSON.stringify(established.palette)),
    fonts: JSON.parse(JSON.stringify(established.fonts)),
    captions: JSON.parse(JSON.stringify(established.captions)),
  };
}
