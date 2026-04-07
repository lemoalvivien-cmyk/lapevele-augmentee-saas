import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Plus, Check, Trash2, ShieldAlert } from "lucide-react";

export default function Collectivites() {
  const { user } = useAuth();
  const [tab, setTab] = useState("whitelist");
  const [whitelist, setWhitelist] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // commune stores slug for AllowedUser
  const [newEntry, setNewEntry] = useState({ email: "", commune: "", role_cible: "operator", nom_contact: "" });
  const [newCommune, setNewCommune] = useState({ nom: "", slug: "", code_postal: "", maire_nom: "", type_collectivite: "commune" });

  useEffect(() => { if (user?.role === "admin") load(); }, [user]);

  const load = async () => {
    const [wl, c, u, profiles] = await Promise.all([
      base44.entities.AllowedUser.list("-created_date"),
      base44.entities.Commune.list("-created_date"),
      base44.entities.User.list("-created_date"),
      base44.entities.UserProfile.list("-created_date"),
    ]);
    // Enrich users with profile data (role_local, commune from UserProfile)
    const profileMap = Object.fromEntries(profiles.map(p => [p.email, p]));
    const enriched = u.map(usr => ({ ...usr, role_local: profileMap[usr.email]?.role_local || 'citizen', commune: profileMap[usr.email]?.commune || '' }));
    setWhitelist(wl); setCommunes(c); setUsers(enriched);
    setLoading(false);
  };

  const addWhitelist = async () => {
    if (!newEntry.email || !newEntry.commune) return;
    await base44.entities.AllowedUser.create({ ...newEntry, statut_activation: "authorized", invited_at: new Date().toISOString() });
    setNewEntry({ email: "", commune: "", role_cible: "operator", nom_contact: "" });
    load();
  };

  const activateEntry = async (item) => {
    await base44.entities.AllowedUser.update(item.id, { statut_activation: "active", activated_at: new Date().toISOString() });
    load();
  };

  const deleteEntry = async (id) => {
    await base44.entities.AllowedUser.delete(id);
    load();
  };

  const addCommune = async () => {
    if (!newCommune.nom || !newCommune.slug) return;
    await base44.entities.Commune.create({ ...newCommune, statut: "active" });
    setNewCommune({ nom: "", slug: "", code_postal: "", maire_nom: "", type_collectivite: "commune" });
    load();
  };

  const setCommuneStatut = async (communeId, statut) => {
    await base44.entities.Commune.update(communeId, { statut });
    load();
  };

  // Met à jour UserProfile (role_local et commune sont dans UserProfile, pas User)
  const setUserRole = async (userEmail, field, value) => {
    const profiles = await base44.entities.UserProfile.filter({ email: userEmail });
    if (profiles.length) {
      await base44.entities.UserProfile.update(profiles[0].id, { [field]: value });
    } else {
      await base44.entities.UserProfile.create({ email: userEmail, user_ref: userEmail, commune: field === 'commune' ? value : '', role_local: field === 'role_local' ? value : 'citizen' });
    }
    load();
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-primary">Accès super-administrateur requis</h1>
        </div>
      </div>
    );
  }

  const roleLabel = { operator: "Agent", mayor: "Maire", deputy: "Adjoint", comms: "Communication", interco_admin: "Admin interco" };
  const statutColor = { authorized: "bg-yellow-100 text-yellow-700", active: "bg-green-100 text-green-700", suspended: "bg-red-100 text-red-700" };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-2">Administration</h1>
        <p className="text-muted-foreground mb-8">Gestion des collectivités, accès mairie et utilisateurs</p>

        <div className="flex gap-1 mb-8 border-b border-border">
          {[{ key: "whitelist", label: "Accès mairie" }, { key: "communes", label: "Collectivités" }, { key: "users", label: "Utilisateurs" }, { key: "rgpd", label: "🔒 RGPD" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`py-3 px-5 font-semibold text-sm border-b-2 -mb-px transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <>
            {/* WHITELIST */}
            {tab === "whitelist" && (
              <div>
                <div className="bg-card border border-border rounded-xl p-5 mb-6">
                  <h2 className="font-bold text-primary mb-4">Ajouter un accès</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <input value={newEntry.email} onChange={e => setNewEntry(n => ({ ...n, email: e.target.value }))}
                      placeholder="Email *" className="border border-border rounded-xl px-4 py-2.5 text-sm" />
                    <select value={newEntry.commune} onChange={e => setNewEntry(n => ({ ...n, commune: e.target.value }))}
                      className="border border-border rounded-xl px-4 py-2.5 text-sm bg-background">
                      <option value="">— Commune (slug) —</option>
                      {communes.map(c => <option key={c.id} value={c.slug}>{c.nom} ({c.slug})</option>)}
                    </select>
                    <select value={newEntry.role_cible} onChange={e => setNewEntry(n => ({ ...n, role_cible: e.target.value }))}
                      className="border border-border rounded-xl px-4 py-2.5 text-sm bg-background">
                      {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input value={newEntry.nom_contact} onChange={e => setNewEntry(n => ({ ...n, nom_contact: e.target.value }))}
                      placeholder="Nom contact" className="border border-border rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <button onClick={addWhitelist} className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-xl text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {whitelist.map(w => (
                    <div key={w.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary">{w.email}</p>
                        <p className="text-sm text-muted-foreground">{w.commune} · {roleLabel[w.role_cible]}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statutColor[w.statut_activation]}`}>
                        {w.statut_activation}
                      </span>
                      {w.statut_activation !== "active" && (
                        <button onClick={() => activateEntry(w)} className="bg-accent text-accent-foreground p-2 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteEntry(w.id)} className="text-destructive p-2 rounded-lg hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMMUNES */}
            {tab === "communes" && (
              <div>
                <div className="bg-card border border-border rounded-xl p-5 mb-6">
                  <h2 className="font-bold text-primary mb-4">Ajouter une collectivité</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <input value={newCommune.nom} onChange={e => setNewCommune(n => ({ ...n, nom: e.target.value }))}
                      placeholder="Nom *" className="border border-border rounded-xl px-4 py-2.5 text-sm" />
                    <input value={newCommune.slug} onChange={e => setNewCommune(n => ({ ...n, slug: e.target.value }))}
                      placeholder="Slug * (ex: orchies)" className="border border-border rounded-xl px-4 py-2.5 text-sm" />
                    <input value={newCommune.code_postal} onChange={e => setNewCommune(n => ({ ...n, code_postal: e.target.value }))}
                      placeholder="Code postal" className="border border-border rounded-xl px-4 py-2.5 text-sm" />
                    <input value={newCommune.maire_nom} onChange={e => setNewCommune(n => ({ ...n, maire_nom: e.target.value }))}
                      placeholder="Nom du maire" className="border border-border rounded-xl px-4 py-2.5 text-sm" />
                    <select value={newCommune.type_collectivite} onChange={e => setNewCommune(n => ({ ...n, type_collectivite: e.target.value }))}
                      className="border border-border rounded-xl px-4 py-2.5 text-sm bg-background">
                      <option value="commune">Commune</option>
                      <option value="intercommunalite">Intercommunalité</option>
                    </select>
                  </div>
                  <button onClick={addCommune} className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-xl text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {communes.map(c => (
                    <div key={c.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 flex-wrap">
                      <div className="flex-1">
                        <p className="font-semibold text-primary">{c.nom} <span className="text-muted-foreground font-normal text-sm">/{c.slug}</span></p>
                        {c.maire_nom && <p className="text-sm text-muted-foreground">Maire : {c.maire_nom}</p>}
                      </div>
                      <select
                        value={c.statut || "prospect"}
                        onChange={e => setCommuneStatut(c.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border border-border bg-background cursor-pointer ${
                          c.statut === "active" ? "text-green-700" : c.statut === "suspended" ? "text-red-700" : "text-gray-600"
                        }`}
                      >
                        <option value="prospect">Prospect</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspendue</option>
                        <option value="archived">Archivée</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* USERS */}
            {tab === "users" && (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary">{u.full_name || u.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <select value={u.role_local || "citizen"} onChange={e => setUserRole(u.email, "role_local", e.target.value)}
                      className="border border-border rounded-lg px-3 py-2 text-sm bg-background">
                      {["citizen","operator","mayor","deputy","comms","interco_admin","superadmin"].map(r =>
                        <option key={r} value={r}>{r}</option>
                      )}
                    </select>
                    <input defaultValue={u.commune || ""} onBlur={e => setUserRole(u.email, "commune", e.target.value)}
                      placeholder="Commune…" className="border border-border rounded-lg px-3 py-2 text-sm w-36" />
                  </div>
                ))}
              </div>
            )}

            {/* RGPD */}
            {tab === "rgpd" && <RgpdTab />}
          </>
        )}
      </div>
    </div>
  );
}

function RgpdTab() {
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!confirm) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await base44.functions.invoke("deleteUserData", { email });
      setResult(res.data);
      setEmail("");
      setConfirm(false);
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async () => {
    setPurgeLoading(true);
    setPurgeResult(null);
    try {
      const res = await base44.functions.invoke("purgeExpiredData", {});
      setPurgeResult(res.data);
    } catch (err) {
      setPurgeResult({ error: err.message });
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      {/* Purge automatique */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-bold text-primary mb-1 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Purge des données expirées
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Supprime les tokens expirés, les logs de rate-limit (&gt;24h) et les logs email (&gt;90 jours).
        </p>
        <button onClick={handlePurge} disabled={purgeLoading}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-xl text-sm disabled:opacity-60">
          {purgeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "🗑️"} Lancer la purge
        </button>
        {purgeResult && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm">
            {purgeResult.error ? (
              <p className="text-red-600 font-bold">{purgeResult.error}</p>
            ) : (
              <>
                <p className="font-bold text-green-700 mb-1">✓ Purge effectuée</p>
                <p>Tokens supprimés : <strong>{purgeResult.deleted?.tokens}</strong></p>
                <p>RateLimitLog supprimés : <strong>{purgeResult.deleted?.rateLogs}</strong></p>
                <p>EmailLog supprimés : <strong>{purgeResult.deleted?.emailLogs}</strong></p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Suppression données utilisateur */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-bold text-primary mb-1 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Droit à l'effacement (Art. 17 RGPD)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Supprime le profil, les réactions et participations. Anonymise les dossiers et désactive les tokens associés.
        </p>
        <form onSubmit={handleDelete} className="space-y-4">
          <input
            required type="email" value={email} onChange={e => { setEmail(e.target.value); setConfirm(false); setResult(null); }}
            placeholder="Email de l'utilisateur *"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background" />

          {email && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-sm text-muted-foreground">
                Je confirme vouloir supprimer toutes les données personnelles de <strong>{email}</strong>. Cette action est irréversible.
              </span>
            </label>
          )}

          {error && <p className="text-sm font-bold text-red-600 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          <button type="submit" disabled={loading || !confirm || !email}
            className="flex items-center gap-2 bg-destructive text-destructive-foreground font-bold py-2.5 px-5 rounded-xl text-sm disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer les données
          </button>
        </form>

        {result && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
            <p className="font-bold text-green-700 mb-2">✓ Données traitées pour {result.email}</p>
            <p>Profils supprimés : <strong>{result.result?.profiles}</strong></p>
            <p>Réactions supprimées : <strong>{result.result?.reactions}</strong></p>
            <p>Participations supprimées : <strong>{result.result?.participations}</strong></p>
            <p>Dossiers anonymisés : <strong>{result.result?.dossiers_anonymises}</strong></p>
            <p>Tokens désactivés : <strong>{result.result?.tokens_desactives}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}