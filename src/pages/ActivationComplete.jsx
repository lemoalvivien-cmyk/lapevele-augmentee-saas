import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ActivationComplete() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("completing");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return; // wait for auth

    const storedEmail = sessionStorage.getItem("activation_email");
    const storedEntryId = sessionStorage.getItem("activation_entry_id");

    if (!storedEmail || !storedEntryId) {
      // No pending activation — if they're already a mairie user, redirect
      navigate("/mairie/tableau-de-bord");
      return;
    }

    if (user.email !== storedEmail) {
      setStep("error");
      setError(`Vous êtes connecté avec ${user.email} mais l'activation était prévue pour ${storedEmail}. Déconnectez-vous et réessayez.`);
      return;
    }

    runCompletion(user, storedEntryId);
  }, [user]);

  const runCompletion = async (user, entryId) => {
    try {
      const entries = await base44.entities.AllowedUser.filter({ email: user.email });
      const entry = entries.find(e => e.id === entryId) || entries[0];

      if (!entry) { setStep("error"); setError("Entrée d'accès introuvable. Contactez l'administrateur."); return; }
      if (entry.statut_activation === "suspended") { setStep("error"); setError("Votre accès a été suspendu. Contactez l'administrateur."); return; }

      const communes = await base44.entities.Commune.filter({ slug: entry.commune });
      const commune = communes[0];
      if (!commune || commune.statut !== "active") {
        setStep("error");
        setError(`La collectivité "${entry.commune}" n'est pas active. Contactez l'administrateur.`);
        return;
      }

      const profiles = await base44.entities.UserProfile.filter({ email: user.email });
      if (profiles.length) {
        await base44.entities.UserProfile.update(profiles[0].id, {
          commune: entry.commune, role_local: entry.role_cible, is_active: true,
        });
      } else {
        await base44.entities.UserProfile.create({
          user_ref: user.email, email: user.email,
          full_name: user.full_name || "",
          commune: entry.commune, role_local: entry.role_cible, is_active: true,
        });
      }

      await base44.entities.AllowedUser.update(entry.id, {
        statut_activation: "active",
        activated_at: new Date().toISOString(),
      });

      sessionStorage.removeItem("activation_email");
      sessionStorage.removeItem("activation_entry_id");

      setStep("done");
      setTimeout(() => navigate("/mairie/tableau-de-bord"), 1500);
    } catch (err) {
      setStep("error");
      setError("Erreur lors de l'activation : " + err.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {step === "completing" && (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-primary mb-2">Activation en cours…</h1>
            <p className="text-muted-foreground text-sm">Finalisation de votre accès mairie.</p>
          </>
        )}
        {step === "done" && (
          <>
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h1 className="text-xl font-bold text-primary mb-2">Accès activé !</h1>
            <p className="text-muted-foreground text-sm">Redirection vers votre tableau de bord…</p>
          </>
        )}
        {step === "error" && (
          <>
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-primary mb-3">Activation échouée</h1>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{error}</p>
            <Link to="/activation" className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl inline-block">
              Recommencer
            </Link>
          </>
        )}
      </div>
    </div>
  );
}