import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Save, Upload } from "lucide-react";
import MairieGuard from "@/components/MairieGuard";

export default function Parametres() {
  const { user } = useAuth();
  const [commune, setCommune] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const res = await base44.functions.invoke('getMairieData', { operation: 'commune_config', params: {} });
    if (res.data?.commune_data) {
      setCommune(res.data.commune_data);
      setForm(res.data.commune_data);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    if (commune) await base44.functions.invoke('updateCommuneConfig', { updates: form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      set('photo_hero', res.file_url);
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading) return <MairieGuard><div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></MairieGuard>;

  return (
    <MairieGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-8">Paramètres de la commune</h1>

          {!commune ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800 font-medium">Votre commune n'est pas encore configurée dans le système.</p>
              <p className="text-sm text-yellow-700 mt-1">Contactez l'administrateur de la plateforme.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <Section title="Informations publiques">
                <Field label="Message de bienvenue">
                  <textarea value={form.message_bienvenue_public || ""} onChange={e => set("message_bienvenue_public", e.target.value)}
                    rows={3} className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary" />
                </Field>
                <Field label="Message du maire (Place du village)">
                  <textarea value={form.message_du_maire || ""} onChange={e => set("message_du_maire", e.target.value)}
                    rows={4} className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary" />
                </Field>
                <Field label="Quartiers (séparés par virgule)">
                  <input value={form.quartier_labels || ""} onChange={e => set("quartier_labels", e.target.value)}
                    placeholder="Centre-ville, Les Prés, Zone industrielle…"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </Field>
                <Field label="Photo du hero">
                  <div className="space-y-3">
                    <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary transition-colors">
                      <div className="text-center">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium">Cliquez pour télécharger une photo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG (max 5MB)</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={photoUploading} className="hidden" />
                    </label>
                    {form.photo_hero && (
                      <div className="relative rounded-xl overflow-hidden">
                        <img loading="lazy" src={form.photo_hero} alt="Aperçu" className="w-full h-40 object-cover" />
                        <button
                          type="button"
                          onClick={() => set('photo_hero', null)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded hover:opacity-90"
                        >
                          ✕ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </Field>
              </Section>

              <Section title="Contact mairie">
                <Field label="Email de contact public">
                  <input value={form.email_contact || ""} onChange={e => set("email_contact", e.target.value)}
                    placeholder="mairie@commune.fr"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </Field>
                <Field label="Téléphone">
                  <input value={form.telephone_contact || ""} onChange={e => set("telephone_contact", e.target.value)}
                    placeholder="03 20 XX XX XX"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </Field>
                <Field label="Adresse mairie">
                  <input value={form.adresse_mairie || ""} onChange={e => set("adresse_mairie", e.target.value)}
                    placeholder="1 Place de la Mairie, 59000 Commune"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </Field>
              </Section>

              <button onClick={save} disabled={saving || photoUploading}
                className="flex items-center gap-2 bg-primary text-primary-foreground font-bold py-4 px-8 rounded-xl text-base disabled:opacity-60">
                <Save className="w-5 h-5" />
                {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer les modifications"}
              </button>
            </div>
          )}
        </div>
      </div>
    </MairieGuard>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-bold text-primary mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-1.5">{label}</label>
      {children}
    </div>
  );
}