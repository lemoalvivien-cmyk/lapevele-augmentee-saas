import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function ModalAide({ post, onClose, onSuccess }) {
  const [form, setForm] = useState({ nom: "", email: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const spamKey = `aider_${post.id}`;
    if (sessionStorage.getItem(spamKey)) { onClose(); return; }
    if (form.email) {
      const dupCheck = await base44.functions.invoke('checkReactionExists', {
        village_post: post.id,
        type_reaction: 'je_peux_aider',
        user_email: form.email,
      }).catch(() => ({ data: { exists: false } }));
      if (dupCheck.data?.exists) { onClose(); return; }
    }
    setSending(true);
    await base44.entities.VillageReaction.create({
      village_post: post.id,
      type_reaction: "je_peux_aider",
      user_name: form.nom,
      user_email: form.email,
    });
    sessionStorage.setItem(`aider_${post.id}`, "1");
    setSending(false);
    onSuccess(post.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-ink/10">
        <h2 className="font-black text-lg mb-1" style={{ color: "#1D1836" }}>{post.titre}</h2>
        {post.type_aide && (
          <p className="text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: "#63C7FF" }}>
            Aide : {post.type_aide}
          </p>
        )}
        {post.date_souhaitee && (
          <p className="text-xs mb-3 font-medium" style={{ color: "#1D1836", opacity: 0.5 }}>
            Date : {new Date(post.date_souhaitee).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.7 }}>
          Laissez vos coordonnées, la mairie vous contactera.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="Votre prénom *"
            className="w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none font-medium"
            style={{ borderColor: "#e5e0d8", color: "#1D1836", backgroundColor: "#FFF8F1" }}
          />
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Votre email *"
            className="w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none font-medium"
            style={{ borderColor: "#e5e0d8", color: "#1D1836", backgroundColor: "#FFF8F1" }}
          />
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border-2 rounded-xl py-3 text-sm font-bold"
              style={{ borderColor: "#e5e0d8", color: "#1D1836" }}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 shadow-md"
              style={{ backgroundColor: "#FF6A00" }}>
              {sending ? "Envoi…" : "🤝 Je peux aider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}