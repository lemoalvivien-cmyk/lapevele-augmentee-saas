import { useState, useEffect } from "react";
import { isAIEnabled } from "@/lib/app-params";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, ArrowLeft, Send, Camera, Sparkles, Trophy, Eye, EyeOff, CheckCircle, XCircle, Play, ExternalLink } from "lucide-react";
import MairieGuard from "@/components/MairieGuard";
import { useAuth } from "@/lib/AuthContext";

const statutColors = {
  nouveau: "bg-blue-100 text-blue-700", qualifie: "bg-purple-100 text-purple-700",
  en_cours: "bg-yellow-100 text-yellow-700", resolu: "bg-green-100 text-green-700", rejete: "bg-gray-100 text-gray-600",
};
const statutLabels = { nouveau: "Nouveau", qualifie: "Qualifié", en_cours: "En cours", resolu: "Résolu", rejete: "Rejeté" };
const prioriteEmoji = { urgente: "🔴", haute: "🟡", normale: "🔵", basse: "⚪" };
const typeEmoji = { signaler: "🚨", proposer: "💡", aider: "🤝" };
const typeLabels = { signaler: "Signalement", proposer: "Idée", aider: "Offre d'aide" };


export default function DossierDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [communeSlug, setCommuneSlug] = useState(null);
  const [servicesList, setServicesList] = useState([]);

  // Edit fields
  const [editCategorie, setEditCategorie] = useState("");
  const [editPriorite, setEditPriorite] = useState("");
  const [editService, setEditService] = useState("");
  const [saving, setSaving] = useState(false);

  // Note
  const [newNote, setNewNote] = useState("");
  const [noteVisible, setNoteVisible] = useState(false);
  const [sendingNote, setSendingNote] = useState(false);

  // Photo après
  const [photoApresFile, setPhotoApresFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Résolu flow
  const [showResoluModal, setShowResoluModal] = useState(false);
  const [resoluStep, setResoluStep] = useState("photo"); // photo | actions
  const [resoluPhotoFile, setResoluPhotoFile] = useState(null);
  const [creatingVictory, setCreatingVictory] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [victoryCreated, setVictoryCreated] = useState(false);
  const [postCreated, setPostCreated] = useState(false);
  const [victoryDraft, setVictoryDraft] = useState(null);
  const [victoryReviewModal, setVictoryReviewModal] = useState(false);
  const aiVictoryEnabled = isAIEnabled('generate_victory');

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoadError(null);
    try {
      const [detailRes, svcsRes] = await Promise.all([
        base44.functions.invoke('getMairieData', { operation: 'dossier_detail', params: { dossierId: id } }),
        base44.functions.invoke('getMairieData', { operation: 'services', params: {} }),
      ]);
      if (detailRes.data?.error) {
        setLoadError(detailRes.data.error);
        setLoading(false);
        return;
      }
      const { dossier: d, updates: u, token: t } = detailRes.data;
      setCommuneSlug(detailRes.data.commune);
      setServicesList((svcsRes.data.services || []).map(s => s.nom));
      setDossier(d);
      setEditCategorie(d.categorie || "");
      setEditPriorite(d.priorite || "normale");
      setEditService(d.service_assigne || "");
      setUpdates(u || []);
      setToken(t || null);
    } catch {
      setLoadError("Erreur de chargement. Réessayez.");
    }
    setLoading(false);
  };

  const patch = async (fields) => {
    await base44.functions.invoke('updateDossier', { dossierId: id, updates: fields });
    setDossier(d => ({ ...d, ...fields }));
  };

  const saveEdits = async () => {
    setActionError(null);
    setSaving(true);
    try {
      await patch({ categorie: editCategorie, priorite: editPriorite, service_assigne: editService });
    } catch {
      setActionError("Échec de la sauvegarde. Réessayez.");
    }
    setSaving(false);
  };

  const sendNote = async () => {
    if (!newNote.trim()) return;
    setSendingNote(true);
    const res = await base44.functions.invoke('createDossierUpdate', {
      dossierId: id,
      type_update: noteVisible ? "public" : "interne",
      contenu: newNote,
      visible_citoyen: noteVisible,
    });
    setUpdates(res.data.updates || []);
    setNewNote(""); setNoteVisible(false);
    setSendingNote(false);
  };

  const uploadPhotoApres = async (file) => {
    setUploadingPhoto(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    await patch({ photo_apres: res.file_url });
    setPhotoApresFile(null);
    setUploadingPhoto(false);
  };

  const passerEnCours = async () => {
    await patch({ statut: "en_cours" });
  };

  const passerRejete = async () => {
    await patch({ statut: "rejete" });
  };

  const initResolu = () => {
    if (dossier.photo_apres) setResoluStep("actions");
    else setResoluStep("photo");
    setVictoryCreated(false);
    setPostCreated(false);
    setShowResoluModal(true);
  };

  const confirmerResolu = async (withPhotoFile) => {
    setSaving(true);
    let extra = {};
    if (withPhotoFile) {
      const res = await base44.integrations.Core.UploadFile({ file: withPhotoFile });
      extra.photo_apres = res.file_url;
    }
    await patch({ statut: "resolu", resolved_at: new Date().toISOString(), ...extra });
    // Note visible auto
    setResoluStep("actions");
    setSaving(false);
  };

  const genererVictoryCard = async () => {
    setCreatingVictory(true);
    setVictoryDraft(null);
    try {
      const res = await base44.functions.invoke('qwenAssist', {
        mode: 'generate_victory',
        user_input: `Type: ${dossier.type_action}\nTitre: ${dossier.titre_public}\nDescription: ${dossier.description_brute}\nCommune: ${dossier.commune}\nCatégorie: ${dossier.categorie}`,
      });

      if (res.data?.success && res.data?.data) {
        const victory = res.data.data;
        setVictoryDraft({
          titre: victory.titre || "",
          resume: victory.resume || "",
          angle_communication: victory.angle_communication || "",
          texte_post: victory.texte_post || "",
          chiffre_cle: victory.chiffre_cle || "",
        });
        setVictoryReviewModal(true);
      } else {
        setActionError("Erreur lors de la génération. Réessayez.");
      }
    } catch {
      setActionError("Erreur lors de la génération. Réessayez.");
    } finally {
      setCreatingVictory(false);
    }
  };

  const confirmerVictoryCard = async () => {
    if (!victoryDraft) return;
    try {
      await base44.functions.invoke('getMairieData', {
        operation: 'create_victory_card',
        params: { data: {
          commune: dossier.commune,
          dossier: id,
          titre: victoryDraft.titre,
          resume: victoryDraft.resume,
          angle_communication: victoryDraft.angle_communication,
          texte_post: victoryDraft.texte_post,
          chiffre_cle: victoryDraft.chiffre_cle,
          statut: "brouillon",
          generated_at: new Date().toISOString(),
        }},
      });
      setVictoryCreated(true);
      setVictoryReviewModal(false);
      setVictoryDraft(null);
    } catch {
      setActionError("Erreur lors de la sauvegarde. Réessayez.");
    }
  };

  const genererVillagePost = async () => {
    if (!aiVictoryEnabled) return;
    setCreatingPost(true);
    try {
      const res = await base44.functions.invoke('qwenAssist', {
        mode: 'rewrite_mairie',
        user_input: `Rédige une publication courte et positive pour la Place du Village pour informer les habitants que ce dossier a été résolu : ${dossier.titre_public} (commune : ${dossier.commune}). 3 phrases max, ton chaleureux et factuel.`,
      });
      const texte = res.data?.data?.text || `Bonne nouvelle : "${dossier.titre_public}" a été traité par notre commune. Merci à tous pour votre confiance.`;
      await base44.functions.invoke('getMairieData', {
        operation: 'create_village_post',
        params: { data: {
          commune: dossier.commune, type_post: "victoire",
          titre: `Résolu : ${dossier.titre_public}`,
          contenu: texte, resume: texte.slice(0, 100),
          dossier_source: id, est_public: false,
          published_at: new Date().toISOString(),
        }},
      });
      setPostCreated(true);
    } catch {
      setActionError("Erreur lors de la création du VillagePost. Réessayez.");
    } finally {
      setCreatingPost(false);
    }
  };

  const envoyerMsgCitoyen = async () => {
    setSendingNote(true);
    const res = await base44.functions.invoke('createDossierUpdate', {
      dossierId: id,
      type_update: "public",
      contenu: `Bonne nouvelle : votre demande "${dossier.titre_public}" a été traitée et résolue. Merci pour votre signalement !`,
      visible_citoyen: true,
    });
    setUpdates(res.data.updates || []);
    setSendingNote(false);
    setShowResoluModal(false);
  };

  if (loading) {
    return (
      <MairieGuard>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </MairieGuard>
    );
  }

  if (!dossier) {
    return (
      <MairieGuard>
        <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground gap-4">
          <div className="text-4xl">🔍</div>
          <p className="font-semibold">{loadError || "Dossier introuvable ou accès non autorisé."}</p>
          <button onClick={() => navigate("/mairie/dossiers")} className="text-sm text-primary underline">← Retour aux dossiers</button>
        </div>
      </MairieGuard>
    );
  }

  const suiviUrl = token ? `${window.location.origin}/mon-suivi/${token.token}` : null;

  return (
    <MairieGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Nav */}
          <button onClick={() => navigate("/mairie/dossiers")} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Retour aux dossiers
          </button>

          {/* En-tête */}
          <div className="bg-card border border-border rounded-xl p-6 mb-5">
            <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
              <div className="flex items-start gap-3">
                <span className="text-4xl shrink-0">{typeEmoji[dossier.type_action]}</span>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">
                    {typeLabels[dossier.type_action]} · #{dossier.id.slice(-8).toUpperCase()}
                  </p>
                  <h1 className="text-2xl font-bold text-primary leading-tight">{dossier.titre_public}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dossier.commune} · {new Date(dossier.created_date).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statutColors[dossier.statut]}`}>
                  {statutLabels[dossier.statut]}
                </span>
                {dossier.visible_place_du_village && (
                  <span className="text-xs font-bold bg-yellow-50 border border-yellow-300 text-yellow-700 px-3 py-1 rounded-full">
                    🏘 Place du Village
                  </span>
                )}
                {dossier.ai_needs_review && (
                  <span className="text-xs font-bold bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 rounded-full">
                    ⚠️ À réviser IA
                  </span>
                )}
              </div>
            </div>

            {/* Méta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Catégorie{dossier.categorie && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-2">IA</span>}</p>
                <p className="text-sm font-medium text-primary mt-0.5">{dossier.categorie || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Priorité{dossier.priorite && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-2">IA</span>}</p>
                <p className="text-sm font-medium text-primary mt-0.5">{dossier.priorite ? `${prioriteEmoji[dossier.priorite]} ${dossier.priorite}` : "—"}</p>
              </div>
              <Meta label="Quartier" val={dossier.quartier} />
              <Meta label="Adresse" val={dossier.adresse} />
              <Meta label="Service suggéré" val={dossier.service_suggere} />
              <Meta label="Service assigné" val={dossier.service_assigne} />
              {dossier.resolved_at && (
                <Meta label="Résolu le" val={new Date(dossier.resolved_at).toLocaleDateString("fr-FR")} />
              )}
            </div>

            {/* Coordonnées */}
            {(dossier.email_citoyen || dossier.nom_citoyen) && (
              <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                👤 {[dossier.nom_citoyen, dossier.email_citoyen].filter(Boolean).join(" · ")}
              </div>
            )}

            {/* Lien suivi */}
            {suiviUrl && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Lien de suivi citoyen :</span>
                <a href={suiviUrl} target="_blank" rel="noopener noreferrer"
                  className="text-accent underline font-medium flex items-center gap-1">
                  Ouvrir <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => navigator.clipboard.writeText(suiviUrl)}
                  className="text-muted-foreground hover:text-primary underline">
                  Copier
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description brute</h2>
              <p className="text-sm leading-relaxed">{dossier.description_brute}</p>
            </div>
            {dossier.description_resumee && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Résumé IA</h2>
                <p className="text-sm leading-relaxed bg-primary/5 border border-primary/20 rounded-xl p-3">{dossier.description_resumee}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Photos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Avant</p>
                {dossier.photo_avant ? (
                  <img loading="lazy" src={dossier.photo_avant} alt="avant" className="w-full rounded-xl object-cover max-h-52" />
                ) : (
                  <div className="w-full h-32 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground text-sm">Pas de photo</div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Après</p>
                {dossier.photo_apres ? (
                  <img loading="lazy" src={dossier.photo_apres} alt="après" className="w-full rounded-xl object-cover max-h-52" />
                ) : (
                  <label className="w-full h-32 bg-secondary border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors gap-2">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Joindre photo après</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      if (e.target.files[0]) uploadPhotoApres(e.target.files[0]);
                    }} />
                    {uploadingPhoto && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Actions de qualification */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <h2 className="font-bold text-primary mb-4">Qualifier / Assigner</h2>
            {actionError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-3">{actionError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Catégorie</label>
                <input value={editCategorie} onChange={e => setEditCategorie(e.target.value)}
                  placeholder="Ex : voirie, éclairage, espaces verts…"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Priorité</label>
                <select value={editPriorite} onChange={e => setEditPriorite(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:border-primary">
                  {["basse", "normale", "haute", "urgente"].map(p => (
                    <option key={p} value={p}>{prioriteEmoji[p]} {p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Service assigné</label>
                <select value={editService} onChange={e => setEditService(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:border-primary">
                  <option value="">— choisir —</option>
                  {servicesList.length > 0
                    ? servicesList.map(s => <option key={s} value={s}>{s}</option>)
                    : <option value={editService} disabled>{editService || "Aucun service configuré"}</option>
                  }
                </select>
              </div>
            </div>
            <button onClick={saveEdits} disabled={saving}
              className="bg-primary text-primary-foreground font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-60 flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enregistrer les modifications
            </button>
          </div>

          {/* Actions de statut */}
          {!["resolu", "rejete"].includes(dossier.statut) && (
            <div className="bg-card border border-border rounded-xl p-5 mb-5">
              <h2 className="font-bold text-primary mb-4">Changer le statut</h2>
              <div className="flex flex-wrap gap-3">
                {dossier.statut !== "en_cours" && (
                  <button onClick={passerEnCours}
                    className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 text-yellow-700 font-semibold py-2.5 px-5 rounded-xl text-sm hover:bg-yellow-100 transition-colors">
                    <Play className="w-4 h-4" /> Passer en cours
                  </button>
                )}
                <button onClick={initResolu}
                  className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 font-semibold py-2.5 px-5 rounded-xl text-sm hover:bg-green-100 transition-colors">
                  <CheckCircle className="w-4 h-4" /> Marquer résolu
                </button>
                <button onClick={passerRejete}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-600 font-semibold py-2.5 px-5 rounded-xl text-sm hover:bg-gray-100 transition-colors">
                  <XCircle className="w-4 h-4" /> Rejeter
                </button>
              </div>
            </div>
          )}

          {/* Ajouter note / message */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <h2 className="font-bold text-primary mb-3">Ajouter une note ou un message</h2>
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3}
              placeholder="Note interne ou message visible par le citoyen…"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary mb-3" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={noteVisible} onChange={e => setNoteVisible(e.target.checked)} className="w-4 h-4" />
                <span className="flex items-center gap-1 text-muted-foreground">
                  {noteVisible ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4" />}
                  {noteVisible ? "Visible par le citoyen" : "Note interne uniquement"}
                </span>
              </label>
              <button onClick={sendNote} disabled={sendingNote || !newNote.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-2 px-5 rounded-lg text-sm disabled:opacity-60">
                <Send className="w-4 h-4" /> {sendingNote ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>

          {/* Historique */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <h2 className="font-bold text-primary mb-4">Historique complet</h2>
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune mise à jour pour l'instant.</p>
            ) : (
              <div className="space-y-3">
                {updates.map(u => (
                  <div key={u.id} className={`border-l-4 pl-4 py-1 ${u.visible_citoyen ? "border-accent" : "border-border"}`}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                      <span className={`font-semibold ${u.visible_citoyen ? "text-accent" : "text-muted-foreground"}`}>
                        {u.visible_citoyen ? "👁 Message citoyen" : "🔒 Note interne"}
                      </span>
                      <span>·</span>
                      <span>{new Date(u.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {u.auteur && <span>· {u.auteur}</span>}
                    </div>
                    <p className="text-sm leading-relaxed">{u.contenu}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal Review VictoryCard */}
      {victoryReviewModal && victoryDraft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full shadow-xl my-auto">
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" /> Revoir la VictoryCard
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Vérifiez et modifiez le brouillon avant de le créer.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Titre</label>
                <input value={victoryDraft.titre} onChange={e => setVictoryDraft(d => ({ ...d, titre: e.target.value }))}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Résumé</label>
                <input value={victoryDraft.resume} onChange={e => setVictoryDraft(d => ({ ...d, resume: e.target.value }))}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Angle humain / local</label>
                <input value={victoryDraft.angle_communication} onChange={e => setVictoryDraft(d => ({ ...d, angle_communication: e.target.value }))}
                  placeholder="Ex: action collective, aide locale, etc." className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Texte de post</label>
                <textarea value={victoryDraft.texte_post} onChange={e => setVictoryDraft(d => ({ ...d, texte_post: e.target.value }))} rows={4}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Chiffre clé (optionnel)</label>
                <input value={victoryDraft.chiffre_cle} onChange={e => setVictoryDraft(d => ({ ...d, chiffre_cle: e.target.value }))}
                  placeholder="Ex: 3 semaines, 50€ économisés…" className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-muted-foreground">
              <p className="font-semibold text-primary mb-1">💡 Ce brouillon sera créé en statut "Brouillon" dans Preuves.</p>
              <p>Vous pourrez le revoir, modifier ou publier plus tard.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setVictoryDraft(null); setVictoryReviewModal(false); }}
                className="flex-1 border border-border text-muted-foreground font-semibold py-3 rounded-xl text-sm">
                Ignorer
              </button>
              <button onClick={genererVictoryCard}
                className="flex-1 border border-border text-muted-foreground font-semibold py-3 rounded-xl text-sm hover:bg-secondary transition-colors">
                ↺ Restaurer IA
              </button>
              <button onClick={confirmerVictoryCard}
                className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm hover:shadow-md transition-all">
                Créer le brouillon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Résolu */}
       {showResoluModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" /> Marquer comme résolu
            </h2>

            {resoluStep === "photo" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Une photo "après" renforce la crédibilité de la résolution. Souhaitez-vous en joindre une ?
                </p>
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:border-primary transition-colors">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {resoluPhotoFile ? `📷 ${resoluPhotoFile.name}` : "Choisir une photo (optionnel)"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setResoluPhotoFile(e.target.files[0] || null)} />
                </label>
                <div className="flex gap-3">
                  <button onClick={() => { confirmerResolu(resoluPhotoFile); }}
                    disabled={saving}
                    className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Confirmer la résolution
                  </button>
                  <button onClick={() => setShowResoluModal(false)}
                    className="border border-border text-muted-foreground font-semibold py-3 px-4 rounded-xl text-sm">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {resoluStep === "actions" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">Dossier marqué résolu ✅ Que souhaitez-vous faire ?</p>

                {aiVictoryEnabled && (
                  <>
                    <ActionRow
                      icon={<Trophy className="w-5 h-5 text-yellow-500" />}
                      label="Créer une VictoryCard (brouillon)"
                      desc="Génère un texte prêt à publier sur la Place du Village."
                      onClick={genererVictoryCard}
                      loading={creatingVictory}
                      done={victoryCreated}
                      doneLabel="Créée → voir dans Preuves"
                    />
                    <ActionRow
                      icon={<Sparkles className="w-5 h-5 text-accent" />}
                      label="Créer un VillagePost (brouillon)"
                      desc="Publication pré-remplie, non publiée immédiatement."
                      onClick={genererVillagePost}
                      loading={creatingPost}
                      done={postCreated}
                      doneLabel="Créé → voir Place du Village"
                    />
                  </>
                )}

                <ActionRow
                  icon={<Send className="w-5 h-5 text-primary" />}
                  label="Envoyer un message au citoyen"
                  desc='Envoie une mise à jour publique "résolu" visible via le lien de suivi.'
                  onClick={envoyerMsgCitoyen}
                  loading={sendingNote}
                  done={false}
                />

                <button onClick={() => setShowResoluModal(false)}
                  className="w-full border border-border text-muted-foreground font-semibold py-3 rounded-xl text-sm mt-2">
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </MairieGuard>
  );
}

function Meta({ label, val }) {
  if (!val) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-primary mt-0.5">{val}</p>
    </div>
  );
}

function ActionRow({ icon, label, desc, onClick, loading, done, doneLabel }) {
  return (
    <button onClick={onClick} disabled={loading || done}
      className={`w-full flex items-start gap-3 text-left p-4 rounded-xl border transition-colors
        ${done ? "bg-green-50 border-green-200" : "border-border hover:bg-secondary"}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary">{done ? (doneLabel || "✅ Fait") : label}</p>
        {!done && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
      {done && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
    </button>
  );
}