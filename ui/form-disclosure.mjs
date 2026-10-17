// Native validation must expose a field before the browser tries to focus it.
export function revealInvalidField(event) {
  const field = event.target;
  if (!field?.closest || !field.focus) return;
  let section = field.closest("details");
  while (section) {
    section.open = true;
    section = section.parentElement?.closest("details");
  }
  field.focus();
}
