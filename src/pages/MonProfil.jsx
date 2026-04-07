import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, User, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function MonProfil() {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [communes, setCommunes] = useState([]);
  const [form, setForm] = useState({ nom: "", telephone: "", commune: "", quartier: "", centres_interet: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rgpdConsent, setRgpdConsent] = useState(false);

  useEffect(() => { init(); loadCommunes(); }, []);

  const loadCommunes = async () => {
    const data = await base44.entities.Commune.filter({ statut: "active" }, "nom");
    setCommunes(data);
  };

  const init = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) { setLoading(false); return; }
    const user = await base44.auth.me();
    setAuthUser(user);
    const profiles = await base44.entities.UserProfile.filter({ email: user.email });
    const p = profiles[0] || null;
    setProfile(p);
    setForm({
      nom: p?.full_name || user.full_name || "",
      telephone: p?.telephone || "",
      commune: p?.commune || "",
      quartier: p?.quartier || "",
      centres_interet: p?.centres_interet || "",
    });
    setLoading(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      email: authUser.email,
      full_name: form.nom,
      telephone: form.telephone,
      commune: form.commune,
      quartier: form.quartier,
      centres_interet: form.centres_interet,
      user_ref: authUser.email,
    };
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, data);
    } else {
      const created = await base44.entities.UserProfile.create(data);
      setProfile(created);
    }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F1" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-5">🏘️</div>
          <h1 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Mon espace citoyen</h1>

          <div className="rounded-2xl px-5 py-4 mb-6 text-left space-y-2 border-2" style={{ backgroundColor: "#FFD84D33", borderColor: "#FFD84D" }}>
            <p className="text-sm font-bold" style={{ color: "#1D1836" }}>✅ Le compte est optionnel pour commencer.</p>
            <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.75 }}>Vous pouvez signaler, proposer ou aider sans compte.</p>
            <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.75 }}>Le compte sert uniquement à personnaliser votre expérience locale.</p>
          </div>

          <button
            onClick={() => base44.auth.redirectToLogin("/mon-profil")}
            className="w-full text-white font-black py-5 px-6 text-lg rounded-2xl shadow-lg transition-all hover:scale-105 mb-4"
            style={{ backgroundColor: "#FF6A00" }}>
            Créer mon compte ou me connecter →
          </button>
          <p className="text-xs mb-6" style={{ color: "#1D1836", opacity: 0.35 }}>
            Première fois ? Un compte citoyen sera créé automatiquement.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/agir" className="text-sm font-bold underline underline-offset-4" style={{ color: "#FF6A00" }}>Contribuer sans compte →</Link>
            <Link to="/place-du-village" className="text-sm font-bold underline underline-offset-4" style={{ color: "#FF6A00" }}>Voir la Place du village →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8 bg-white rounded-2xl p-5 border-2 border-ink/10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FF6A00" }}>
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: "#1D1836" }}>Mon espace local</h1>
            <p className="text-sm font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>{authUser.email}</p>
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3 mb-5 border-2 text-sm" style={{ backgroundColor: "#FFD84D22", borderColor: "#FFD84D", color: "#1D1836" }}>
          Le compte sert à personnaliser votre expérience locale. Tout est optionnel sauf votre commune.
        </div>

        <div className="bg-white rounded-2xl border-2 border-ink/10 p-6 mb-5">
          <p className="text-sm mb-5 leading-relaxed" style={{ color: "#1D1836", opacity: 0.6 }}>
            Ces informations restent privées. Elles ne sont jamais partagées ni utilisées à des fins commerciales.
          </p>
          <form onSubmit={save} className="space-y-4">
            <PF label="Prénom et nom" hint="Optionnel — pour personnaliser vos échanges">
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                placeholder="Ex : Marie Dupont"
                className="pfi" />
            </PF>

            <PF label="Votre commune *" hint="Pour voir uniquement ce qui concerne votre village">
              {communes.length > 0 ? (
                <select value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))} className="pfi bg-white">
                  <option value="">— Sélectionnez votre commune —</option>
                  {communes.map(c => <option key={c.id} value={c.slug}>{c.nom}</option>)}
                </select>
              ) : (
                <input value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))}
                  placeholder="Ex : Orchies, Mons-en-Pévèle…" className="pfi" />
              )}
            </PF>

            <PF label="Votre quartier" hint="Optionnel — pour voir ce qui se passe près de chez vous">
              <input value={form.quartier} onChange={e => setForm(f => ({ ...f, quartier: e.target.value }))}
                placeholder="Ex : Centre-ville, Les Acacias…" className="pfi" />
            </PF>

            <PF label="Téléphone" hint="Optionnel — jamais partagé, uniquement si vous souhaitez être recontacté">
              <input type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                placeholder="06 XX XX XX XX" className="pfi" />
            </PF>

            <PF label="Ce qui vous tient à cœur" hint="Optionnel — séparés par des virgules">
              <input value={form.centres_interet} onChange={e => setForm(f => ({ ...f, centres_interet: e.target.value }))}
                placeholder="Ex : culture, sport, enfance, nature, solidarité…" className="pfi" />
            </PF>

            {/* Consentement RGPD — uniquement pour la première création de profil */}
            {!profile && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rgpdConsent}
                  onChange={e => setRgpdConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-orange"
                />
                <span className="text-xs leading-relaxed font-medium" style={{ color: "#1D1836", opacity: 0.75 }}>
                  J'accepte que mes données de profil soient utilisées pour personnaliser mon expérience locale.{" "}
                  <a href="/mentions-legales" target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 font-bold" style={{ color: "#FF6A00" }}>
                    Voir nos mentions légales
                  </a>.
                </span>
              </label>
            )}

            <button type="submit" disabled={saving || (!profile && !rgpdConsent)}
              className="w-full text-white font-black py-4 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-105"
              style={{ backgroundColor: saved ? "#4CAF50" : "#FF6A00" }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
               : saved ? <><CheckCircle className="w-4 h-4" /> Enregistré !</>
               : "Enregistrer mon profil"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border-2 border-ink/10 p-5">
          <h2 className="font-black text-xs uppercase tracking-widest mb-3" style={{ color: "#1D1836", opacity: 0.4 }}>Accès rapides</h2>
          <div className="flex flex-col gap-2">
            <Link to="/place-du-village" className="text-sm font-bold underline underline-offset-4" style={{ color: "#FF6A00" }}>Place du village →</Link>
            <Link to="/agenda" className="text-sm font-bold underline underline-offset-4" style={{ color: "#FF6A00" }}>Agenda local →</Link>
            <Link to="/agir" className="text-sm font-bold underline underline-offset-4" style={{ color: "#FF6A00" }}>Signaler / Proposer / Aider →</Link>
          </div>
        </div>
      </div>
    </div>
    <style>{`.pfi { width:100%; border:2px solid rgba(29,24,54,0.15); border-radius:0.75rem; padding:0.75rem 1rem; font-size:1rem; outline:none; font-family:inherit; font-weight:500; color:#1D1836; background:#FFF8F1; } .pfi:focus { border-color:#FF6A00; }`}</style>
  </>
  );
}

function PF({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#1D1836", opacity: 0.5 }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1 font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>{hint}</p>}
    </div>
  );
}