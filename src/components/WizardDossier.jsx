import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Camera, MapPin, ArrowLeft, CheckCircle, Loader2, X } from "lucide-react";
import { isAIEnabled } from "@/lib/app-params";
import { emitSignal } from "@/lib/emitSignal";

const configs = {
  signaler: {
    emoji: "🚨",
    label: "Signaler un problème",
    champ2Label: "Décrivez le problème *",
    champ2Placeholder: "Ex : Nid de poule dangereux rue de la Paix, devant le n°12…",
    hasAdresse: true,
  },
  proposer: {
    emoji: "💡",
    label: "Proposer une idée",
    champ2Label: "Votre idée *",
    champ2Placeholder: "Ex : Installer un banc sur la place centrale pour les seniors…",
    hasAdresse: false,
  },
  aider: {
    emoji: "🤝",
    label: "Proposer mon aide",
    champ2Label: "Ce que vous pouvez apporter *",
    champ2Placeholder: "Ex : Je peux aider à entretenir les espaces verts le week-end…",
    hasAdresse: false,
  },
};

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

function generateTitre(typeAction, description) {
  const preview = description.slice(0, 60).trim();
  const labels = { signaler: "Signalement", proposer: "Idée", aider: "Aide proposée" };
  return `${labels[typeAction] || "Contribution"} : ${preview}${description.length > 60 ? "…" : ""}`;
}

export default function WizardDossier({ typeAction }) {
  const config = configs[typeAction];
  const [step, setStep] = useState(1);
  const [communes, setCommunes] = useState([]);
  const [communesLoading, setCommunesLoading] = useState(true);
  const [communesError, setCommunesError] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [adresse, setAdresse] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [commune, setCommune] = useState("");
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [quartier, setQuartier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [rgpdConsent, setRgpdConsent] = useState(false);
  const [rewriteModal, setRewriteModal] = useState(false);
  const [rewriteProposal, setRewriteProposal] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaTimeout, setCaptchaTimeout] = useState(false);
  const aiPublicEnabled = isAIEnabled('rewrite_public');

  const loadCommunes = () => {
    setCommunesError(false);
    setCommunesLoading(true);
    fetch(`${window.location.origin}/api/apps/69c6b3f69a0c0e88e2529d4a/entities/Commune?q=${encodeURIComponent(JSON.stringify({ statut: "active" }))}&sort=nom`)
      .then(r => r.json())
      .then(data => {
        setCommunes(Array.isArray(data) ? data : []);
        setCommunesLoading(false);
      })
      .catch(() => { setCommunesError(true); setCommunesLoading(false); });
  };

  useEffect(() => { loadCommunes(); }, []);
  useEffect(() => {
    window.onTurnstileWizard = (token) => setCaptchaToken(token);
    return () => { delete window.onTurnstileWizard; };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setCaptchaTimeout(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handlePhoto = async (file) => {
    const isValid = await base44.functions.invoke('validateImageUpload', {
      fileSize: file.size,
      mimeType: file.type,
      fileName: file.name,
    });
    if (!isValid.data?.valid) {
      setSubmitError(isValid.data?.error || "Fichier invalide.");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleGeo = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAdresse(`Géolocalisation : ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  const handleRewrite = async () => {
    if (!description.trim()) return;
    setRewriteLoading(true);
    setRewriteError("");
    setRewriteProposal("");
    try {
      const res = await base44.functions.invoke('qwenAssist', {
        mode: 'rewrite_public',
        user_input: description,
      });
      if (res.data?.success && res.data?.data?.text) {
        setRewriteProposal(res.data.data.text);
        setRewriteModal(true);
      } else {
        setRewriteError("Service temporairement indisponible. Veuillez réessayer.");
      }
    } catch {
      setRewriteError("Service temporairement indisponible. Veuillez réessayer.");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleSubmit = async () => {
    const lastSubmit = parseInt(sessionStorage.getItem("last_submit") || "0");
    const now = Date.now();
    if (now - lastSubmit < 60000) {
      setSubmitError("Vous avez déjà envoyé une contribution récemment. Merci de patienter une minute avant de soumettre à nouveau.");
      return;
    }
    setSubmitError("");
    setLoading(true);
    try {
      const rlRes = await base44.functions.invoke('rateLimitCheck', {
        action: 'dossier_create',
        identifier: email || 'anonymous',
      });
      if (!rlRes.data?.allowed) {
        const minutes = Math.ceil((rlRes.data?.retry_after || 3600) / 60);
        setSubmitError(`Vous avez atteint la limite de soumissions. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        setLoading(false);
        return;
      }
      let photo_avant = "";
      if (photo) {
        const res = await base44.integrations.Core.UploadFile({ file: photo });
        photo_avant = res.file_url;
      }
      const titre_public = generateTitre(typeAction, description);
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      const res = await base44.functions.invoke('createDossierWithToken', {
        dossierData: {
          type_action: typeAction,
          titre_public,
          description_brute: description,
          commune,
          adresse,
          latitude: coords?.lat,
          longitude: coords?.lng,
          quartier,
          email_citoyen: email || "",
          nom_citoyen: nom,
          photo_avant,
          statut: "nouveau",
          captcha_token: captchaToken,
        },
        tokenData: {
          token,
          actif: true,
          expires_at: expiresAt.toISOString(),
        },
        emailData: {
          email_citoyen: email || '',
          nom_citoyen: nom,
          titre_public,
          commune,
        },
      });
      if (res.data?.error) throw new Error(res.data.error);
      const { dossierId, token: savedToken } = res.data;
      sessionStorage.setItem("last_submit", String(Date.now()));
      emitSignal({
        type: "signale",
        target_type: "dossier",
        target_id: dossierId,
        commune,
        geo_lat: coords?.lat,
        geo_lng: coords?.lng,
        topic_tags: [typeAction],
        weight: 0.8,
        meta: { titre_public },
      });
      setResult({ token: savedToken, dossierId });
    } catch (err) {
      setSubmitError("Une erreur est survenue lors de l'envoi. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const suiviUrl = `${window.location.origin}/mon-suivi/${result.token}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16" style={{ backgroundColor: "#FFF8F1" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ backgroundColor: "#FFD84D" }}>
            <CheckCircle className="w-10 h-10" style={{ color: "#1D1836" }} />
          </div>
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1D1836" }}>Merci !</h1>
          <p className="text-lg leading-relaxed mb-2" style={{ color: "#1D1836", opacity: 0.65 }}>
            Votre contribution a bien été transmise à la mairie.
          </p>
          <p className="text-sm font-bold mb-8" style={{ color: "#1D1836", opacity: 0.4 }}>
            Référence : <span className="font-mono" style={{ color: "#FF6A00" }}>#{result.dossierId.slice(-8).toUpperCase()}</span>
          </p>
          <div className="rounded-2xl p-5 mb-6 text-left border-2" style={{ backgroundColor: "#FFD84D", borderColor: "#1D1836" }}>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#1D1836" }}>Votre lien de suivi personnel</p>
            <p className="font-mono text-sm font-bold break-all leading-relaxed" style={{ color: "#1D1836" }}>{suiviUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(suiviUrl)}
              className="mt-3 text-xs font-black underline underline-offset-4"
              style={{ color: "#1D1836" }}>
              Copier le lien
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to={`/mon-suivi/${result.token}`}
              className="block w-full text-white font-black py-5 text-base text-center rounded-2xl shadow-lg transition-all hover:scale-105"
              style={{ backgroundColor: "#FF6A00" }}>
              Suivre ma demande →
            </Link>
            <Link
              to="/agir"
              className="block w-full font-bold py-4 text-sm text-center rounded-2xl border-2 transition-all hover:bg-white"
              style={{ borderColor: "#1D1836", color: "#1D1836" }}>
              Faire une autre contribution
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8F1" }}>
      {/* Header */}
      <div className="bg-white border-b-2 border-ink/10 px-4 pt-6 pb-5 shadow-sm">
        <Link to="/agir" className="inline-flex items-center gap-1.5 text-sm font-bold mb-4 hover:underline"
          style={{ color: "#FF6A00" }}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{config.emoji}</span>
          <h1 className="text-2xl font-black" style={{ color: "#1D1836" }}>{config.label}</h1>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-0 mt-5">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all"
                style={{
                  backgroundColor: step === s ? "#FF6A00" : step > s ? "#FFD84D" : "white",
                  borderColor: step >= s ? "#FF6A00" : "rgba(29,24,54,0.15)",
                  color: step >= s ? (step === s ? "white" : "#1D1836") : "rgba(29,24,54,0.3)"
                }}>
                {step > s ? "✓" : s}
              </div>
              {s < 3 && <div className="flex-1 h-1 rounded-full transition-all"
                style={{ backgroundColor: step > s ? "#FF6A00" : "rgba(29,24,54,0.1)" }} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>
          <span>Photo</span><span>Détails</span><span>Envoi</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* ÉTAPE 1 — Photo */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black mb-1" style={{ color: "#1D1836" }}>Une photo ? (recommandé)</h2>
              <p className="text-base" style={{ color: "#1D1836", opacity: 0.55 }}>Une image aide la mairie à traiter plus vite. Facultatif.</p>
            </div>
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Aperçu" className="w-full rounded-2xl object-cover max-h-72" />
                <button
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  className="absolute top-3 right-3 bg-white border border-border rounded-full px-3 py-1 text-xs font-semibold text-primary"
                >
                  Changer
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-4 py-14 px-6 cursor-pointer rounded-2xl border-2 border-dashed transition-all hover:shadow-md"
                style={{ borderColor: "#FF6A00", backgroundColor: "#FF6A0010" }}>
                <Camera className="w-12 h-12" style={{ color: "#FF6A00" }} />
                <div className="text-center">
                  <p className="font-black text-lg" style={{ color: "#1D1836" }}>Prendre ou choisir une photo</p>
                  <p className="text-sm mt-1 font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>JPG, PNG — galerie ou appareil photo</p>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files[0] && handlePhoto(e.target.files[0])} />
              </label>
            )}
            <button
              onClick={() => setStep(2)}
              className="w-full text-white font-black py-5 text-base rounded-2xl shadow-lg transition-all hover:scale-105"
              style={{ backgroundColor: "#FF6A00" }}>
              {photo ? "Continuer →" : "Continuer sans photo →"}
            </button>
          </div>
        )}

        {/* ÉTAPE 2 — Description */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black mb-1" style={{ color: "#1D1836" }}>Dites-nous en plus</h2>
              <p className="text-base" style={{ color: "#1D1836", opacity: 0.55 }}>Soyez précis — adresse, nature du problème, contexte.</p>
            </div>

            <div>
              <label className="block font-black mb-1.5 text-sm uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>{config.champ2Label}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                placeholder={config.champ2Placeholder}
                className="w-full rounded-xl px-4 py-3 text-base focus:outline-none resize-none font-medium border-2"
                style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }}
              />
              {aiPublicEnabled && (
                <button
                  type="button"
                  onClick={handleRewrite}
                  disabled={!description.trim() || rewriteLoading}
                  className="mt-2 text-sm font-bold underline underline-offset-2 transition-opacity disabled:opacity-40 hover:opacity-60"
                  style={{ color: "#FF6A00" }}>
                  {rewriteLoading ? "Amélioration en cours…" : "✨ Améliorer mon texte"}
                </button>
              )}
              {rewriteError && (
                <p className="mt-2 text-sm font-bold" style={{ color: "#FF6A00" }}>{rewriteError}</p>
              )}
            </div>

            {config.hasAdresse && (
              <div>
                <label className="block font-black mb-1.5 text-sm uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>Adresse ou lieu</label>
                <div className="flex gap-2">
                  <input
                    value={adresse}
                    onChange={e => setAdresse(e.target.value)}
                    placeholder="Ex : Rue de la Paix, n°12"
                    className="flex-1 rounded-xl px-4 py-3 text-base focus:outline-none font-medium border-2"
                    style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }}
                  />
                  <button
                    type="button"
                    onClick={handleGeo}
                    disabled={geoLoading}
                    title="Ma position"
                    className="shrink-0 px-4 py-3 rounded-xl border-2 transition-all hover:scale-105"
                    style={{ borderColor: "#FF6A00", backgroundColor: "white" }}
                  >
                    {geoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5 text-primary" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block font-black mb-2 text-base uppercase tracking-widest" style={{ color: "#1D1836" }}>🏘️ Votre commune *</label>
              {communesLoading ? (
                <div className="flex items-center gap-2 border-2 rounded-xl px-4 py-3" style={{ borderColor: "rgba(29,24,54,0.15)" }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#FF6A00" }} />
                  <span className="text-sm" style={{ color: "#1D1836", opacity: 0.5 }}>Chargement…</span>
                </div>
              ) : communesError ? (
                <div className="rounded-xl px-4 py-3 text-sm border-2 flex items-center justify-between gap-3" style={{ borderColor: "#FF6A00", backgroundColor: "white" }}>
                  <span style={{ color: "#FF6A00", fontWeight: 700 }}>Impossible de charger les communes. Réessayez.</span>
                  <button type="button" onClick={loadCommunes}
                    className="text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: "#FF6A00" }}>Réessayer</button>
                </div>
              ) : (!Array.isArray(communes) || communes.length === 0) ? (
                <div className="rounded-xl px-4 py-3 text-sm border-2" style={{ borderColor: "#FF6A00", color: "#FF6A00", backgroundColor: "#FF6A0010" }}>
                  Aucune commune disponible. Contactez-nous : <a href="mailto:contact@vlmconsulting.fr" className="underline font-bold">contact@vlmconsulting.fr</a>
                </div>
              ) : (
                <select
                  value={commune}
                  onChange={e => setCommune(e.target.value)}
                  className="w-full rounded-xl px-4 py-4 text-base focus:outline-none font-bold border-2"
                  style={{ borderColor: "#FF6A00", color: "#1D1836", backgroundColor: "white" }}
                >
                  <option value="">— Sélectionnez votre commune —</option>
                  {communes.filter(c => c.type_collectivite === "commune").map(c => (
                    <option key={c.id} value={c.slug}>{c.nom}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="px-5 py-4 rounded-xl border-2 font-black transition-all hover:scale-105"
                style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!description.trim() || !commune || communesError}
                className="flex-1 text-white font-black py-4 text-base rounded-xl shadow-lg transition-all hover:scale-105 disabled:opacity-40"
                style={{ backgroundColor: "#FF6A00" }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 — Coordonnées */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black mb-1" style={{ color: "#1D1836" }}>Pour suivre votre demande</h2>
              <p className="text-base" style={{ color: "#1D1836", opacity: 0.55 }}>Facultatif, mais recommandé. Votre email sert uniquement à vous transmettre le lien de suivi.</p>
            </div>

            <div>
              <label className="block font-black mb-1.5 text-sm uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>Votre email (recommandé)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="pour.le.suivi@email.fr"
                className="w-full rounded-xl px-4 py-3 text-base focus:outline-none font-medium border-2"
                style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }} />
              {!email && (
                <div className="mt-2 rounded-xl px-4 py-2.5 text-xs font-medium border-2 flex items-start gap-2" style={{ borderColor: "#FFD84D", backgroundColor: "#FFFBE8", color: "#1D1836" }}>
                  <span className="shrink-0">⚠️</span>
                  <span>Sans email, votre lien de suivi ne vous sera pas envoyé. Pensez à le copier sur l'écran de confirmation.</span>
                </div>
              )}
              <p className="text-xs mt-1 font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>Jamais partagé. Uniquement pour votre lien de suivi.</p>
            </div>
            <div>
              <label className="block font-black mb-1.5 text-sm uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>Votre prénom (optionnel)</label>
              <input value={nom} onChange={e => setNom(e.target.value)}
                placeholder="Ex : Marie"
                className="w-full rounded-xl px-4 py-3 text-base focus:outline-none font-medium border-2"
                style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }} />
            </div>
            <div>
              <label className="block font-black mb-1.5 text-sm uppercase tracking-widest" style={{ color: "#1D1836", opacity: 0.6 }}>Votre quartier (optionnel)</label>
              <input value={quartier} onChange={e => setQuartier(e.target.value)}
                placeholder="Ex : Centre-ville, Les Acacias…"
                className="w-full rounded-xl px-4 py-3 text-base focus:outline-none font-medium border-2"
                style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }} />
            </div>

            <div className="rounded-xl px-4 py-3 text-sm font-bold border-2" style={{ backgroundColor: "#FFD84D33", borderColor: "#FFD84D", color: "#1D1836" }}>
              ✅ Aucun compte à créer. Contribution transmise directement à la mairie.
            </div>

            {(email || nom) && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rgpdConsent}
                  onChange={e => setRgpdConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-orange"
                />
                <span className="text-xs leading-relaxed font-medium" style={{ color: "#1D1836", opacity: 0.75 }}>
                  J'accepte que mes données soient traitées pour le suivi de ma contribution.{" "}
                  <a href="/mentions-legales" target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 font-bold" style={{ color: "#FF6A00" }}>
                    Voir nos mentions légales
                  </a>.
                </span>
              </label>
            )}

            <div
              id="captcha-wizard"
              className="cf-turnstile"
              data-sitekey="1x00000000000000000000AA"
              data-callback="onTurnstileWizard"
              data-theme="light"
            />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="px-5 py-4 rounded-xl border-2 font-black transition-all hover:scale-105"
                style={{ borderColor: "rgba(29,24,54,0.2)", color: "#1D1836", backgroundColor: "white" }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !description.trim() || (!captchaToken && !captchaTimeout) || ((email || nom) && !rgpdConsent)}
                className="flex-1 text-white font-black py-4 text-base rounded-xl shadow-lg transition-all hover:scale-105 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FF6A00" }}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Envoi…</> : "Envoyer ma contribution"}
              </button>
            </div>
            {submitError && (
              <div className="rounded-xl px-4 py-3 text-sm font-bold border-2" style={{ borderColor: "#FF6A00", color: "#FF6A00", backgroundColor: "white" }}>{submitError}</div>
            )}
          </div>
        )}
      </div>

      {/* Modale rewrite */}
      {rewriteModal && rewriteProposal && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border-2 border-ink/10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-black text-lg" style={{ color: "#1D1836" }}>Voici une version améliorée</h2>
              <button
                type="button"
                onClick={() => setRewriteModal(false)}
                className="shrink-0 p-1 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" style={{ color: "#1D1836", opacity: 0.4 }} />
              </button>
            </div>
            <p className="text-xs font-medium mb-4" style={{ color: "#1D1836", opacity: 0.55 }}>Voici une version reformulée. Vous pouvez la garder ou l'utiliser comme base.</p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-base leading-relaxed" style={{ color: "#1D1836" }}>{rewriteProposal}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRewriteModal(false)}
                className="flex-1 border-2 py-3 rounded-xl text-sm font-bold transition-colors"
                style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "white" }}>
                Garder mon texte
              </button>
              <button
                type="button"
                onClick={() => {
                  setDescription(rewriteProposal);
                  setRewriteModal(false);
                }}
                className="flex-1 text-white font-black py-3 rounded-xl text-sm shadow-lg transition-all hover:scale-105"
                style={{ backgroundColor: "#FF6A00" }}>
                Remplacer par cette version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}