import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, MapPin, LayoutDashboard, FileText, MessageSquare, Trophy, Calendar, Settings, Zap, Users, DollarSign, BarChart3, Handshake, FileBarChart } from "lucide-react";
import { base44 } from "@/api/base44Client";

const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];

export default function InternalLayout() {
  const [open, setOpen] = useState(false);
  const [roleLocal, setRoleLocal] = useState(null);
  const [newDossierCount, setNewDossierCount] = useState(0);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
    if (!token) return;
    fetch("/api/apps/69c6b3f69a0c0e88e2529d4a/entities/User/me", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u) setUser(u); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setRoleLocal(null); return; }
    if (user.role === "admin") { setRoleLocal("superadmin"); return; }
    base44.entities.UserProfile.filter({ email: user.email })
      .then(profiles => setRoleLocal(profiles[0]?.role_local || null))
      .catch(() => setRoleLocal(null));
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    base44.functions.invoke('getMairieData', { operation: 'dossiers', params: {} })
      .then(res => {
        const dossiers = res.data?.dossiers || [];
        setNewDossierCount(dossiers.filter(d => d.statut === 'nouveau').length);
      })
      .catch(() => setNewDossierCount(0));
  }, [user?.email]);

  const isMairie = MAIRIE_ROLES.includes(roleLocal);
  const isAdmin = user?.role === "admin";

  const isActive = (path) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  const mairieLinks = [
    { to: "/mairie/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
    { to: "/mairie/dossiers", label: "Dossiers", icon: FileText, badge: newDossierCount > 0 ? newDossierCount : null },
    { to: "/mairie/place-du-village", label: "Place du village", icon: MessageSquare },
    { to: "/mairie/preuves", label: "Preuves & victoires", icon: Trophy },
    { to: "/mairie/evenements", label: "Événements", icon: Calendar },
    { to: "/mairie/digest", label: "Digest IA", icon: Zap },
    { to: "/mairie/sponsors", label: "Sponsors", icon: Users },
    { to: "/mairie/rapport-mandat", label: "Rapport & Obs.", icon: FileBarChart },
    { to: "/mairie/parametres", label: "Paramètres", icon: Settings },
  ];

  const adminLinks = [
    { to: "/admin/collectivites", label: "Collectivités" },
    { to: "/admin/monitoring", label: "Monitoring" },
    { to: "/admin/revenue", label: "Revenue" },
    { to: "/admin/ia-usage", label: "IA Usage" },
    { to: "/b2b/prospection", label: "Prospection B2B" },
  ];

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: "#f5f4f2" }}>

      <header className="bg-ink text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FF6A00" }}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-sm text-white/80 hover:text-white transition-colors">← Site public</span>
            </Link>

            {/* Séparateur */}
            <span className="text-white/20 text-lg hidden md:block">|</span>

            {/* Label espace interne */}
            <span className="text-xs font-black uppercase tracking-widest text-white/50 hidden md:block">
              {isAdmin && location.pathname.startsWith("/admin") ? "Administration" : "Espace mairie"}
            </span>
          </div>

          {/* Desktop nav interne */}
          <nav className="hidden md:flex items-center gap-4">
            {isMairie && mairieLinks.map(({ to, label, badge }) => (
              <Link key={to} to={to}
                className="text-sm font-semibold transition-colors px-2 py-1 rounded-lg inline-flex items-center gap-2"
                style={isActive(to)
                  ? { color: "#FFD84D" }
                  : { color: "rgba(255,255,255,0.6)" }}>
                {label}
                {badge && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold" style={{ backgroundColor: "#FF6A00", color: "white" }}>
                    {badge}
                  </span>
                )}
              </Link>
            ))}
            {isAdmin && adminLinks.map(({ to, label }) => (
              <Link key={to} to={to}
                className="text-sm font-semibold transition-colors px-2 py-1 rounded-lg"
                style={isActive(to) ? { color: "#FFD84D" } : { color: "rgba(255,255,255,0.6)" }}>
                {label}
              </Link>
            ))}
            <span className="text-white/20 ml-2">|</span>
            <span className="text-xs text-white/40">{user?.email}</span>
          </nav>

          <button className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* Mobile menu interne */}
        {open && (
          <div className="md:hidden bg-ink border-t border-white/10 px-4 pb-6 pt-2 space-y-1">

            {isAdmin && adminLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className="block py-3 text-base font-semibold text-white/70 border-b border-white/10">
                {label}
              </Link>
            ))}
            <Link to="/" onClick={() => setOpen(false)}
              className="block py-3 text-base font-bold"
              style={{ color: "#FF6A00" }}>
              ← Retour au site public
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}