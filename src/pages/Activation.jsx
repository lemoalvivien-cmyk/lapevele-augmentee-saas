import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle, AlertCircle, Loader2, MapPin, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Step machine: email_entry → verifying → auth_redirect → completing → done | error
export default function Activation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("email_entry"); // email_entry | verifying | ready | completing | done | error
  const [error, setError] = useState("");
  const [allowedEntry, setAllowedEntry] = useState(null);

  // Step 1: user submits email → verify AllowedUser + Commune before any auth
  const handleVerify = async (e) => {
    e.preventDefault();
    setStep("verifying");
    setError("");

    const entries = await base44.entities.AllowedUser.filter({ email: email.trim().toLowerCase() });
    const entry = entries[0];

    if (!entry) {
      setStep("error");
      setError("Cet email n'est pas dans la liste des accès autorisés. Contactez votre administrateur.");
      return;
    }

    if (entry.statut_activation === "suspended") {
      setStep("error");
      setError("Votre accès a été suspendu. Contactez l'administrateur de la plateforme.");
      return;
    }

    if (entry.statut_activation === "active") {
      // Already active — redirect to login to confirm identity then to dashboard
      base44.auth.redirectToLogin("/mairie/tableau-de-bord");
      return;
    }

    // statut_activation === "authorized" → check commune (entry.commune stores slug)
    const communes = await base44.entities.Commune.filter({ slug: entry.commune });
    const commune = communes[0];

    if (!commune || commune.statut === "suspended" || commune.statut === "archived") {
      setStep("error");
      setError(`La collectivité "${entry.commune}" n'est pas encore activée. Contactez l'administrateur de la plateforme.`);
      return;
    }

    if (commune.statut === "prospect") {
      setStep("error");
      setError(`La collectivité "${entry.commune}" est en cours d'activation. Vous serez notifié quand l'accès sera disponible.`);
      return;
    }

    // All checks passed — store entry and prompt login
    setAllowedEntry(entry);
    setStep("ready");
  };

  // Step 2: user clicks "Se connecter" — redirect to Base44 auth, return to /activation-complete
  const handleLogin = () => {
    // Store email in sessionStorage so we can complete activation after auth
    sessionStorage.setItem("activation_email", allowedEntry.email);
    sessionStorage.setItem("activation_entry_id", allowedEntry.id);
    base44.auth.redirectToLogin("/activation-complete");
  };

  // If user is already authenticated and lands here directly, run completion
  if (user && step === "email_entry") {
    const storedEmail = sessionStorage.getItem("activation_email");
    const storedEntryId = sessionStorage.getItem("activation_entry_id");

    if (storedEmail && storedEntryId && user.email === storedEmail && step === "email_entry") {
      setStep("completing");
      completeActivation(user, storedEntryId, navigate).then(() => {
        sessionStorage.removeItem("activation_email");
        sessionStorage.removeItem("activation_entry_id");
        setStep("done");
        setTimeout(() => navigate("/mairie/tableau-de-bord"), 1500);
      }).catch(err => {
        setStep("error");
        setError("Une erreur est survenue lors de l'activation : " + err.message);
      });
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Activation de l'accès mairie</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Réservé aux agents et élus autorisés par leur collectivité.
          </p>
        </div>

        {/* EMAIL ENTRY */}
        {step === "email_entry" && (
          <form onSubmit={handleVerify} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">Votre adresse email professionnelle</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@commune.fr"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <button type="submit"
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              Vérifier mon accès <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Seuls les emails préautorisés par l'administration peuvent activer un accès.
            </p>
          </form>
        )}

        {/* VERIFYING */}
        {step === "verifying" && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Vérification de vos droits d'accès…</p>
          </div>
        )}

        {/* READY TO LOGIN */}
        {step === "ready" && allowedEntry && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                <CheckCircle className="w-4 h-4" /> Accès vérifié
              </div>
              <p className="text-sm text-green-700">
                Email autorisé. Commune : <strong>{allowedEntry.commune}</strong>.
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connectez-vous avec <strong>{allowedEntry.email}</strong> pour finaliser l'activation de votre compte.
            </p>
            <button onClick={handleLogin}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity">
              Se connecter pour activer
            </button>
          </div>
        )}

        {/* COMPLETING */}
        {step === "completing" && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Activation de votre compte en cours…</p>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">Compte activé !</h2>
            <p className="text-muted-foreground">Redirection vers votre tableau de bord…</p>
          </div>
        )}

        {/* ERROR */}
        {step === "error" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 leading-relaxed">{error}</p>
            </div>
            <button onClick={() => { setStep("email_entry"); setError(""); setEmail(""); }}
              className="w-full border border-border text-primary font-semibold py-3 rounded-xl text-sm hover:bg-secondary transition-colors">
              Réessayer
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Si le problème persiste, contactez l'administrateur de la plateforme.
            </p>
          </div>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-muted-foreground underline">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}

async function completeActivation(user, entryId, navigate) {
  // Load the AllowedUser entry
  const entries = await base44.entities.AllowedUser.filter({ email: user.email });
  const entry = entries.find(e => e.id === entryId) || entries[0];

  if (!entry) throw new Error("Entrée AllowedUser introuvable.");
  if (entry.statut_activation === "suspended") throw new Error("Accès suspendu.");

  // Verify commune still active (use slug — stable reference)
  const communes = await base44.entities.Commune.filter({ slug: entry.commune });
  const commune = communes[0];
  if (!commune || commune.statut !== "active") throw new Error("Collectivité non active.");

  // Create or update UserProfile
  const profiles = await base44.entities.UserProfile.filter({ email: user.email });
  if (profiles.length) {
    await base44.entities.UserProfile.update(profiles[0].id, {
      commune: entry.commune,
      role_local: entry.role_cible,
      is_active: true,
    });
  } else {
    await base44.entities.UserProfile.create({
      user_ref: user.email,
      email: user.email,
      full_name: user.full_name || "",
      commune: entry.commune,
      role_local: entry.role_cible,
      is_active: true,
    });
  }

  // Mark AllowedUser as active
  await base44.entities.AllowedUser.update(entry.id, {
    statut_activation: "active",
    activated_at: new Date().toISOString(),
  });
}