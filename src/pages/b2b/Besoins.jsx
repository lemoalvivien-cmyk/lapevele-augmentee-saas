import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, X, CheckCircle } from "lucide-react";

const TYPE_BESOINS = ["fournisseur","prestataire","partenariat","recrutement","financement","client","autre"];
const URGENCES = ["faible","normale","urgente"];
const URGENCE_LABELS = { faible: "Pas urgent", normale: "Sous 3 mois", urgente: "Urgent (< 1 mois)" };

export default function B2BBesoins() {
  const [besoins, setBesoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [filtre, setFiltre] = useState("tous");
  const [form, setForm] = useState({
    titre: "", description: "", type_besoin: "prestataire", secteur_cible: "", budget_indicatif: "",
    commune: "", perimetre: "pevele", urgence: "normale",
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.BusinessNeed.filter({ statut: "actif" }, "-created_at", 50).catch(() => []);
    setBesoins(data);
    setLoading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.commune.trim()) return;
    setSending(true);
    setError(null);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) throw new Error("Veuillez vous connecter pour publier un besoin.");
      const user = await base44.auth.me();
      const expires = new Date(Date.now() + 90 * 86400000).toISOString();
      await base44.entities.BusinessNeed.create({
        ...form,
        user_id: user.id,
        statut: "actif",
        expires_at: expires,
        nb_vues: 0,
        nb_introductions: 0,
        created_at: new Date().toISOString(),
      });
      setSent(true);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message ?? "Erreur lors de la publication.");
    } finally {
      setSending(false);
    }
  };

  const filtered = filtre === "tous" ? besoins : besoins.filter(b => b.type_besoin === filtre);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black" style={{ color: "#1D1836" }}>📋 Besoins B2B</h1>
            <p className="text-sm font-medium mt-1" style={{ color: "#1D1836", opacity: 0.6 }}>
              {besoins.length} besoin{besoins.length !== 1 ? "s" : ""} actif{besoins.length !== 1 ? "s" : ""} sur le territoire
            </p>
          </div>
          <button onClick={() => { setShowForm(true); setSent(false); setError(null); }}
            className="inline-flex items-center gap-2 text-white font-black py-3 px-6 rounded-2xl shadow-md transition-all hover:scale-105 text-sm"
            style={{ backgroundColor: "#FF6A00" }}>
            <Plus className="w-4 h-4" /> Publier un besoin
          </button>
        </div>

        {sent && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm font-bold text-green-800">Besoin publié ! Il apparaîtra dans la liste et sera visible par les entreprises du territoire.</p>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="max-w-4xl mx-auto px-4 mb-6 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFiltre("tous")}
          className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all"
          style={{ backgroundColor: filtre === "tous" ? "#FFD84D" : "white", borderColor: filtre === "tous" ? "#1D1836" : "rgba(29,24,54,0.15)", color: "#1D1836" }}>
          Tous
        </button>
        {TYPE_BESOINS.map(t => (
          <button key={t} onClick={() => setFiltre(t)}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all capitalize"
            style={{ backgroundColor: filtre === t ? "#FFD84D" : "white", borderColor: filtre === t ? "#1D1836" : "rgba(29,24,54,0.15)", color: "#1D1836" }}>
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
            <div className="text-4xl mb-3">📭</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Aucun besoin actif</h2>
            <p className="text-sm" style={{ color: "#1D1836", opacity: 0.6 }}>Soyez le premier à publier un besoin B2B sur le territoire.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border-2 p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
                style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-black px-3 py-1 rounded-full capitalize"
                    style={{ backgroundColor: "#FFD84D", color: "#1D1836" }}>
                    {b.type_besoin?.replace("_", " ")}
                  </span>
                  <span className="text-xs font-black px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: b.urgence === "urgente" ? "#FF6A00" : b.urgence === "normale" ? "#63C7FF" : "#B8F5C4",
                      color: b.urgence === "urgente" ? "white" : "#1D1836",
                    }}>
                    {URGENCE_LABELS[b.urgence] ?? b.urgence}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base mb-1" style={{ color: "#1D1836" }}>{b.titre}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#1D1836", opacity: 0.65 }}>{b.description}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>📍 {b.commune} · {b.perimetre}</span>
                  {b.budget_indicatif && (
                    <span className="text-xs font-black" style={{ color: "#FF6A00" }}>{b.budget_indicatif}</span>
                  )}
                </div>
                <button
                  onClick={() => alert("Connectez-vous pour proposer une offre à ce besoin.")}
                  className="w-full text-white font-black py-2.5 rounded-xl text-sm transition-all hover:scale-105"
                  style={{ backgroundColor: "#FF6A00" }}>
                  Proposer une offre / Mise en relation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
              <h2 className="font-black text-lg" style={{ color: "#1D1836" }}>Publier un besoin B2B</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

              <div>
                <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Titre du besoin *</label>
                <input type="text" required value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="Ex: Cherche développeur web local, Besoin transporteur 5T..."
                  className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                  style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Type de besoin</label>
                  <select value={form.type_besoin} onChange={e => setForm(f => ({ ...f, type_besoin: e.target.value }))}
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }}>
                    {TYPE_BESOINS.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Urgence</label>
                  <select value={form.urgence} onChange={e => setForm(f => ({ ...f, urgence: e.target.value }))}
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }}>
                    {URGENCES.map(u => <option key={u} value={u}>{URGENCE_LABELS[u]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Description *</label>
                <textarea rows={4} required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez votre besoin en détail : contexte, volume, délai, critères..."
                  className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none resize-none"
                  style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Commune *</label>
                  <input type="text" required value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))}
                    placeholder="Orchies, Seclin..."
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1" style={{ color: "#1D1836" }}>Budget indicatif</label>
                  <input type="text" value={form.budget_indicatif} onChange={e => setForm(f => ({ ...f, budget_indicatif: e.target.value }))}
                    placeholder="Ex: 5 000€, sur devis"
                    className="w-full border-2 rounded-xl p-3 text-sm focus:outline-none"
                    style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
                </div>
              </div>

              <button type="submit" disabled={sending}
                className="w-full text-white font-black py-3.5 rounded-2xl text-sm disabled:opacity-60 transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FF6A00" }}>
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication...</> : "Publier mon besoin"}
              </button>

              <p className="text-xs text-center" style={{ color: "#1D1836", opacity: 0.5 }}>
                Visible 90 jours · RGPD · Connexion requise
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
