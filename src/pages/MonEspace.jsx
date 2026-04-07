import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Loader2, User, FileText, Calendar, LogOut, Edit2, Check, X } from "lucide-react";
import LameDecision from "@/components/LameDecision";

const STATUT_LABELS = {
  nouveau: { label: "Nouveau", color: "#63C7FF" },
  qualifie: { label: "Qualifié", color: "#FFD84D" },
  en_cours: { label: "En cours", color: "#FF6A00" },
  resolu: { label: "Résolu", color: "#4CAF50" },
  rejete: { label: "Rejeté", color: "#EF4444" },
};

const TYPE_LABELS = {
  signaler: "🚨 Signalement",
  proposer: "💡 Proposition",
  aider: "🤝 Aide proposée",
};

export default function MonEspace() {
  const { user, isLoadingAuth, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigate("/se-connecter");
    }
  }, [user, isLoadingAuth]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profiles, dossiersData, eventsData] = await Promise.all([
        base44.entities.UserProfile.filter({ email: user.email }),
        base44.entities.Dossier.filter({ email_citoyen: user.email }, "-created_date", 20),
        base44.entities.EvenementLocal.filter({ created_by: user.email }, "-created_date", 20),
      ]);
      const p = profiles[0] || { email: user.email, full_name: user.full_name };
      setProfile(p);
      setEditForm({ full_name: p.full_name || user.full_name || "", telephone: p.telephone || "", commune: p.commune || "", quartier: p.quartier || "" });
      setDossiers(dossiersData);
      setEvenements(eventsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, editForm);
        setProfile({ ...profile, ...editForm });
      } else {
        const created = await base44.entities.UserProfile.create({ ...editForm, email: user.email });
        setProfile(created);
      }
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingAuth || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black" style={{ color: "#1D1836" }}>Mon espace</h1>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border-2 transition-all hover:scale-105"
            style={{ borderColor: "#1D1836", color: "#1D1836", backgroundColor: "white" }}>
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>

        {/* 🧠 Lame de Décision — Zero-Interface UX */}
        <LameDecision />

        {/* Profil */}
        <div className="bg-white rounded-2xl border-2 p-6" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FF6A00" }}>
                <User className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-black" style={{ color: "#1D1836" }}>Mon profil</h2>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all"
                style={{ borderColor: "#FF6A00", color: "#FF6A00", backgroundColor: "white" }}>
                <Edit2 className="w-3.5 h-3.5" /> Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-60"
                  style={{ backgroundColor: "#FF6A00", color: "white" }}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Enregistrer
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all"
                  style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }}>
                  <X className="w-3.5 h-3.5" /> Annuler
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="space-y-3">
              <ProfileRow label="Nom complet" value={editForm.full_name || user.full_name || "—"} />
              <ProfileRow label="Email" value={user.email} />
              <ProfileRow label="Téléphone" value={editForm.telephone || "—"} />
              <ProfileRow label="Commune" value={editForm.commune || "—"} />
              <ProfileRow label="Quartier" value={editForm.quartier || "—"} />
            </div>
          ) : (
            <div className="space-y-3">
              <EditField label="Nom complet" value={editForm.full_name} onChange={v => setEditForm(f => ({ ...f, full_name: v }))} />
              <ProfileRow label="Email" value={user.email} />
              <EditField label="Téléphone" value={editForm.telephone} onChange={v => setEditForm(f => ({ ...f, telephone: v }))} />
              <EditField label="Commune" value={editForm.commune} onChange={v => setEditForm(f => ({ ...f, commune: v }))} />
              <EditField label="Quartier" value={editForm.quartier} onChange={v => setEditForm(f => ({ ...f, quartier: v }))} />
            </div>
          )}
        </div>

        {/* Dossiers */}
        <div className="bg-white rounded-2xl border-2 p-6" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FFD84D" }}>
              <FileText className="w-5 h-5" style={{ color: "#1D1836" }} />
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: "#1D1836" }}>Mes contributions</h2>
              <p className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.45 }}>{dossiers.length} dossier{dossiers.length !== 1 ? "s" : ""} soumis</p>
            </div>
          </div>

          {dossiers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium mb-3" style={{ color: "#1D1836", opacity: 0.5 }}>Aucune contribution pour l'instant.</p>
              <Link to="/agir" className="text-sm font-bold underline" style={{ color: "#FF6A00" }}>Faire une contribution →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {dossiers.map(d => {
                const statut = STATUT_LABELS[d.statut] || { label: d.statut, color: "#aaa" };
                return (
                  <div key={d.id} className="flex items-start justify-between gap-3 p-4 rounded-xl border-2" style={{ borderColor: "rgba(29,24,54,0.07)", backgroundColor: "#FFF8F1" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold mb-1" style={{ color: "#FF6A00" }}>{TYPE_LABELS[d.type_action] || d.type_action}</p>
                      <p className="text-sm font-bold truncate" style={{ color: "#1D1836" }}>{d.titre_public}</p>
                      <p className="text-xs mt-1 font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>
                        {new Date(d.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: statut.color }}>
                      {statut.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Événements */}
        <div className="bg-white rounded-2xl border-2 p-6" style={{ borderColor: "rgba(29,24,54,0.1)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#63C7FF" }}>
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: "#1D1836" }}>Mes événements proposés</h2>
              <p className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.45 }}>{evenements.length} événement{evenements.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {evenements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium mb-3" style={{ color: "#1D1836", opacity: 0.5 }}>Aucun événement proposé pour l'instant.</p>
              <Link to="/agenda" className="text-sm font-bold underline" style={{ color: "#FF6A00" }}>Voir l'agenda →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {evenements.map(e => (
                <div key={e.id} className="flex items-start justify-between gap-3 p-4 rounded-xl border-2" style={{ borderColor: "rgba(29,24,54,0.07)", backgroundColor: "#FFF8F1" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#1D1836" }}>{e.titre}</p>
                    <p className="text-xs mt-1 font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>
                      {e.date_debut ? new Date(e.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                      {e.lieu ? ` · ${e.lieu}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-black px-2.5 py-1 rounded-full border-2"
                    style={{ borderColor: e.est_public ? "#4CAF50" : "rgba(29,24,54,0.2)", color: e.est_public ? "#4CAF50" : "#1D1836", backgroundColor: "white" }}>
                    {e.est_public ? "Public" : "Non publié"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(29,24,54,0.06)" }}>
      <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.4 }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: "#1D1836" }}>{value}</span>
    </div>
  );
}

function EditField({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3 py-1 border-b" style={{ borderColor: "rgba(29,24,54,0.06)" }}>
      <span className="text-xs font-black uppercase tracking-widest w-28 shrink-0" style={{ color: "#1D1836", opacity: 0.4 }}>{label}</span>
      <input
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="flex-1 text-sm font-bold px-3 py-1.5 rounded-lg border-2 focus:outline-none"
        style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "white" }}
      />
    </div>
  );
}