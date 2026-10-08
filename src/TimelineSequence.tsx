import { cloneElement, type ReactElement } from "react";
import { Internals, Sequence, type SequenceProps } from "remotion";

const identities = new WeakMap<object, number>();
let nextIdentity = 0;
function templateKey(template: object) {
  if (!identities.has(template)) identities.set(template, ++nextIdentity);
  return identities.get(template);
}

// Każda rolka dostarcza osobne węzły JSX (src/studio). Zachowujemy ich
// lokalizacje dla Visual Mode; szczegóły animacji nie tworzą nowych ścieżek.
export function TimelineSequence({
  children,
  template,
  overrides,
  ...props
}: SequenceProps & {
  template?: ReactElement<SequenceProps>;
  overrides?: Partial<SequenceProps>;
}) {
  return cloneElement(
    template ?? <Sequence {...props} {...overrides} />,
    template ? { key: templateKey(template) } : {},
    <Internals.DisableSequenceRegistrationProvider>
      {children}
    </Internals.DisableSequenceRegistrationProvider>,
  );
}
