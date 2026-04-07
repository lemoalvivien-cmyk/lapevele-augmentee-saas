import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const KEY = "cookie_consent_v1";
const TTL_DAYS = 180;

export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { value, expires } = JSON.parse(raw);
    if (Date.now() > expires) return null;
    return value; // "all" | "essential"
  } catch {
    return null;
  }
}

function setConsent(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      value,
      expires: Date.now() + TTL_DAYS * 24 * 3600 * 1000,
    }));
  } catch {}
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => { setConsent("all"); setVisible(false); };
  const refuse = () => { setConsent("essential"); setVisible(false); };

  return (
    <div
      role="dialog"
      aria-label="Consentement cookies"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[100] rounded-2xl p-4 border-4 shadow-[6px_6px_0_0_#1D1836]"
      style={{ backgroundColor: "#FFF8F1", borderColor: "#1D1836" }}
    >
      <div className="text-sm font-bold mb-2" style={{ color: "#1D1836" }}>
        🍪 Cookies & signaux territoriaux
      </div>
      <p className="text-xs mb-3" style={{ color: "#1D1836" }}>
        Nous utilisons des cookies techniques (toujours actifs) et des signaux anonymisés
        pour personnaliser la Lame de Décision. Libre à vous de refuser.{" "}
        <Link to="/cookies" className="underline">En savoir plus</Link>
      </p>
      <div className="flex gap-2">
        <button
          onClick={refuse}
          className="flex-1 rounded-xl px-3 py-2 text-xs font-black border-2"
          style={{ backgroundColor: "#FFF", color: "#1D1836", borderColor: "#1D1836" }}
        >
          Refuser
        </button>
        <button
          onClick={accept}
          className="flex-1 rounded-xl px-3 py-2 text-xs font-black border-2 shadow-[3px_3px_0_0_#1D1836]"
          style={{ backgroundColor: "#FF6A00", color: "#FFF", borderColor: "#1D1836" }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
