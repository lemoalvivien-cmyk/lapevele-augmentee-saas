import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function MairieCandidature() {
  const [form, setForm] = useState({ commune: "", prenom: "", nom: "", fonction: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [rgpdConsent, setRgpdConsent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaTimeout, setCaptchaTimeout] = useState(false);

  useEffect(() => {
    window.onTurnstileCandidature = (token) => setCaptchaToken(token);
    return () => { delete window.onTurnstileCandidature; };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setCaptchaTimeout(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const rlRes = await base44.functions.invoke('rateLimitCheck', {
        action: 'lead_create',
        identifier: form.email,
      });
      if (!rlRes.data?.allowed) {
        const minutes = Math.ceil((rlRes.data?.retry_after || 3600) / 60);
        setError(`Trop de demandes. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        setLoading(false);
        return;
      }
      await base44.entities.LeadDemo.create({
        commune: form.commune,
        prenom: form.prenom,
        nom: form.nom,
        fonction: form.fonction,
        email: form.email,
        message: form.message,
      });

      await base44.functions.invoke('sendLeadEmail', {
        prenom: form.prenom,
        nom: form.nom,
        commune: form.commune,
        fonction: form.fonction,
        email: form.email,
        message: form.message,
      }).catch(() => {});

      setSent(true);
    } catch {
      setError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center" style={{ backgroundColor: "#FFF8F1" }}>
        <CheckCircle className="w-14 h-14 mb-6" style={{ color: "#FF6A00" }} />
        <h1 className="text-2xl font-black mb-3" style={{ color: "#1D1836" }}>Demande reçue</h1>
        <p className="text-base max-w-sm mb-2 leading-relaxed" style={{ color: "#1D1836", opacity: 0.65 }}>
          Merci, {form.prenom}. Votre demande a bien été enregistrée et transmise à notre équipe.
        </p>
        <p className="text-sm mb-8 font-medium" style={{ color: "#1D1836", opacity: 0.4 }}>
          Nous reviendrons vers vous à <strong style={{ opacity: 1 }}>{form.email}</strong> dans les meilleurs délais.
        </p>
        <Link to="/" className="text-sm font-bold underline underline-offset-4" style={{ color: "#FF6A00" }}>
          ← Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: "#FFF8F1" }}>
      <div className="max-w-lg mx-auto">

        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold mb-8 hover:underline" style={{ color: "#FF6A00" }}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#FF6A00" }}>Collectivités</p>
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1D1836" }}>Votre commune sur la plateforme</h1>
          <p className="text-base leading-relaxed" style={{ color: "#1D1836", opacity: 0.65 }}>
            Décrivez votre situation en quelques lignes. Notre équipe vous répond directement.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <a href="mailto:contact@vlmconsulting.fr"
              className="inline-flex items-center gap-2 text-white font-black py-2.5 px-5 rounded-full shadow-md transition-all hover:scale-105 text-sm"
              style={{ backgroundColor: "#FF6A00" }}>
              ✉️ contact@vlmconsulting.fr
            </a>
            <a href="tel:+33668733842"
              className="inline-flex items-center gap-2 font-bold py-2.5 px-5 rounded-full border-2 bg-white transition-all hover:shadow-md text-sm"
              style={{ borderColor: "#1D1836", color: "#1D1836" }}>
              📞 06 68 73 38 42
            </a>
          </div>
          <p className="text-xs mt-4 font-medium" style={{ color: "#1D1836", opacity: 0.45 }}>Ou remplissez le formulaire ci-dessous.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-ink/10 p-7 space-y-5 mb-6">
          <Field label="Commune ou collectivité *">
            <input required value={form.commune} onChange={e => set("commune", e.target.value)}
              placeholder="Ex : Mairie d'Orchies, CC Pévèle Carembault…"
              className="fi" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom *">
              <input required value={form.prenom} onChange={e => set("prenom", e.target.value)}
                placeholder="Marie" className="fi" />
            </Field>
            <Field label="Nom *">
              <input required value={form.nom} onChange={e => set("nom", e.target.value)}
                placeholder="Dupont" className="fi" />
            </Field>
          </div>

          <Field label="Votre fonction">
            <input value={form.fonction} onChange={e => set("fonction", e.target.value)}
              placeholder="Ex : Maire, DGS, Chargé de communication…" className="fi" />
          </Field>

          <Field label="Email professionnel *">
            <input required type="email" value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="vous@commune.fr" className="fi" />
          </Field>

          <Field label="Ce que vous souhaitez améliorer (optionnel)">
            <textarea rows={3} value={form.message} onChange={e => set("message", e.target.value)}
              placeholder="Ex : mieux recevoir les signalements, informer les habitants, trouver des bénévoles…"
              className="fi resize-none" />
          </Field>

          {error && (
            <p className="text-sm font-bold rounded-xl px-4 py-3 border-2" style={{ borderColor: "#FF6A00", color: "#FF6A00", backgroundColor: "white" }}>
              {error}
            </p>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={rgpdConsent}
              onChange={e => setRgpdConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-orange"
            />
            <span className="text-xs leading-relaxed font-medium" style={{ color: "#1D1836", opacity: 0.75 }}>
              J'accepte que mes données soient traitées pour répondre à ma demande.{" "}
              <a href="/mentions-legales" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 font-bold" style={{ color: "#FF6A00" }}>
                Voir nos mentions légales
              </a>.
            </span>
          </label>

          <div
            className="cf-turnstile"
            data-sitekey="1x00000000000000000000AA"
            data-callback="onTurnstileCandidature"
            data-theme="light"
          />

          <button type="submit" disabled={loading || !rgpdConsent || (!captchaToken && !captchaTimeout)}
            className="w-full text-white font-black py-4 rounded-xl text-sm shadow-lg transition-all hover:scale-105 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#FF6A00" }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : "Contacter notre équipe"}
          </button>

          <p className="text-xs text-center" style={{ color: "#1D1836", opacity: 0.55 }}>
            Notre équipe vous recontacte directement à l'adresse email fournie.
          </p>
        </form>

        <div className="bg-white rounded-2xl border-2 border-ink/10 p-5 text-center">
          <p className="text-sm font-bold mb-1" style={{ color: "#1D1836" }}>Vous avez déjà reçu un accès ?</p>
          <p className="text-xs mb-3" style={{ color: "#1D1836", opacity: 0.5 }}>
            Si vous avez été invité, utilisez le lien d'activation envoyé par email.
          </p>
          <Link to="/activation"
            className="inline-block text-sm font-black px-5 py-2.5 rounded-full border-2 transition-all hover:shadow-md"
            style={{ borderColor: "#1D1836", color: "#1D1836", backgroundColor: "white" }}>
            Activer mon accès
          </Link>
        </div>

      </div>
      <style>{`.fi { width:100%; border:2px solid rgba(29,24,54,0.15); border-radius:0.75rem; padding:0.75rem 1rem; font-size:1rem; outline:none; font-family:inherit; font-weight:500; color:#1D1836; background:#FFF8F1; transition:border-color 0.15s; } .fi:focus { border-color:#FF6A00; }`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: "#1D1836", opacity: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}