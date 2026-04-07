import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appParams } from "@/lib/app-params";

const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];

// ══════════════════════════════════════════════════════════════════════════
// MairieGuard — Protège l'espace mairie
// Accepte : role=admin (plateforme) OU role_local dans MAIRIE_ROLES (UserProfile)
// ══════════════════════════════════════════════════════════════════════════
export default function MairieGuard({ children }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const token = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
    if (!token) {
      setStatus("denied");
      return;
    }

    const headers = { Authorization: "Bearer " + token };
    const appId = appParams.appId;

    // Étape 1 : récupérer l'utilisateur connecté
    fetch(`/api/apps/${appId}/entities/User/me`, { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(async (user) => {
        if (!user) { setStatus("denied"); return; }

        // Admin plateforme → accès immédiat
        if (user.role === "admin" || user._app_role === "admin") {
          setStatus("ok");
          return;
        }

        // Étape 2 : vérifier role_local dans UserProfile
        try {
          const profileRes = await fetch(
            `/api/apps/${appId}/entities/UserProfile?filter[email]=${encodeURIComponent(user.email)}&limit=1`,
            { headers }
          );
          if (!profileRes.ok) { setStatus("denied"); return; }
          const data = await profileRes.json();
          const profiles = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
          const profile = profiles[0];
          if (profile && MAIRIE_ROLES.includes(profile.role_local)) {
            setStatus("ok");
          } else {
            setStatus("denied");
          }
        } catch {
          setStatus("denied");
        }
      })
      .catch(() => setStatus("denied"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-bold text-gray-800">Accès réservé à l'espace mairie</h2>
        <p className="text-gray-600 text-sm text-center max-w-xs">
          Cet espace est réservé aux agents et élus de la plateforme. Connectez-vous avec vos identifiants mairie.
        </p>
        <Link to="/se-connecter" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold text-sm">
          Se connecter
        </Link>
      </div>
    );
  }

  return children;
}
