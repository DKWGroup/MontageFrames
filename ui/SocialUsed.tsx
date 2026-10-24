import { useEffect, useState } from "react";
import { api } from "./api";

// Znacznik „wrzucona na social media”: stan z biblioteki (initial) albo pobrany z API.
function useSocialUsed(reelName: string | undefined, initial?: boolean) {
  const [used, setUsed] = useState(initial ?? false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initial !== undefined) return setUsed(initial);
    if (!reelName) return;
    let live = true;
    api.social(reelName).then(
      (r) => live && setUsed(r.used),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [reelName, initial]);
  const toggle = (next: boolean) => {
    if (!reelName) return;
    const prev = used;
    setUsed(next);
    setError("");
    api.setSocial(reelName, next).catch((e: Error) => {
      setUsed(prev);
      setError(e.message);
    });
  };
  return { used, toggle, error };
}

// Ramkę karty barwi CSS (:has(.social-used input:checked)), więc karta nie trzyma tego stanu.
export function SocialCheckbox({
  name: reelName,
  title,
  initial,
}: {
  name: string;
  title: string;
  initial?: boolean;
}) {
  const { used, toggle, error } = useSocialUsed(reelName, initial);
  return (
    <label className="social-used">
      <input
        type="checkbox"
        checked={used}
        onChange={(e) => toggle(e.target.checked)}
      />
      <span>
        Wrzucona na social media
        <span className="qc-sr-only">: {title}</span>
      </span>
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
