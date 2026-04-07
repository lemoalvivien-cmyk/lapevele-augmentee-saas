import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Users, MapPin, Briefcase, Search } from "lucide-react";

export default function Rencontres() {
  const [profiles, setProfiles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreSecteur, setFiltreSecteur] = useState("tous");
  const [myProfile, setMyProfile] = useState(null);
  const [topMatches, setTopMatches] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        base44.entities.MatchProfile.filter({ visible: true, open_to_match: true }, "-created_at", 30).catch(() => []),
        base44.entities.FlashDateEvent.filter({ statut: "ouvert" }, "date_debut", 5).catch(() => []),
      ]);
      setProfiles(p);
      setEvents(e);

      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const user = await base44.auth.me();
        const myP = p.find(pr => pr.user_id === user.id);
        setMyProfile(myP ?? null);
        if (myP) {
          const matches = await base44.functions.invoke("matchAffinity", {
            operation: "top_matches", user_id: user.id, limit: 4
          }).catch(() => ({ data: { data: [] } }));
          setTopMatches(matches.data?.data ?? []);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const secteurs = [...new Set(profiles.map(p => p.secteur).filter(Boolean))];
  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.prenom?.toLowerCase().includes(search.toLowerCase()) ||
      p.entreprise?.toLowerCase().includes(search.toLowerCase()) ||
      p.secteur?.toLowerCase().includes(search.toLowerCase());
    const matchSecteur = filtreSecteur === "tous" || p.secteur === filtreSecteur;
    return matchSearch && matchSecteur;
  });

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>

      {/* Hero */}
      <section style={{ backgroundColor: "#FF6FB5" }} className="border-b-2 border-ink/8">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black mb-5 border-2 bg-white/60"
            style={{ borderColor: "#1D1836", color: "#1D1836" }}>
            💫 Rencontres Pro · Pévèle Carembault
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-3" style={{ color: "#1D1836" }}>
            Rencontrez les talents<br />
            <span style={{ color: "white" }}>et visionnaires de Pévèle.</span>
          </h1>
          <p className="text-base font-medium mb-6 max-w-md" style={{ color: "#1D1836", opacity: 0.8 }}>
            Profils, Flash Dates pro et networking local — découvrez vos affinités et construisez votre réseau territorial.
          </p>
          <div className="flex gap-3 flex-wrap">
            {!myProfile ? (
              <Link to="/se-connecter"
                className="inline-flex items-center gap-2 text-white font-black py-3 px-6 rounded-2xl shadow-lg transition-all hover:scale-105 text-sm"
                style={{ backgroundColor: "#1D1836" }}>
                <Users className="w-4 h-4" /> Créer mon profil
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 bg-white/80 font-black py-3 px-6 rounded-2xl text-sm"
                style={{ color: "#1D1836" }}>
                ✅ Profil actif
              </div>
            )}
            <Link to="/flash-date"
              className="inline-flex items-center gap-2 font-black py-3 px-6 rounded-2xl border-2 bg-white/70 transition-all hover:bg-white text-sm"
              style={{ borderColor: "#1D1836", color: "#1D1836" }}>
              ⚡ Flash Date
            </Link>
          </div>
        </div>
      </section>

      {/* Flash Date Events */}
      {events.length > 0 && (
        <section className="bg-white border-b-2 border-ink/8">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <h2 className="text-lg font-black mb-4" style={{ color: "#1D1836" }}>⚡ Flash Dates à venir</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {events.map(ev => (
                <Link key={ev.id} to="/flash-date"
                  className="shrink-0 bg-white rounded-2xl border-2 p-4 w-64 hover:shadow-md transition-all"
                  style={{ borderColor: "#FF6FB5" }}>
                  <div className="text-xs font-black mb-2 text-pink-600">⚡ Flash Date</div>
                  <h3 className="font-black text-sm mb-1" style={{ color: "#1D1836" }}>{ev.titre}</h3>
                  <p className="text-xs mb-2" style={{ color: "#1D1836", opacity: 0.6 }}>
                    {new Date(ev.date_debut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>📍 {ev.commune}</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: ev.prix_billet === 0 ? "#B8F5C4" : "#FFD84D", color: "#1D1836" }}>
                      {ev.prix_billet === 0 ? "Gratuit" : `${ev.prix_billet}€`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top matches si connecté */}
      {topMatches.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-6">
          <h2 className="text-lg font-black mb-3" style={{ color: "#1D1836" }}>⭐ Vos meilleures affinités</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {topMatches.map((m, i) => (
              <div key={i} className="shrink-0 bg-white rounded-2xl border-2 p-4 w-48 text-center"
                style={{ borderColor: "#FF6FB5" }}>
                <div className="text-3xl mb-1 font-black" style={{ color: "#FF6A00" }}>{m.score}%</div>
                <div className="text-xs font-medium" style={{ color: "#1D1836", opacity: 0.6 }}>affinité</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Recherche */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#1D1836", opacity: 0.4 }} />
            <input type="text" placeholder="Nom, entreprise, secteur..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
              style={{ borderColor: "rgba(29,24,54,0.15)", color: "#1D1836", backgroundColor: "#FFF8F1" }} />
          </div>
        </div>

        {/* Filtres secteurs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <button onClick={() => setFiltreSecteur("tous")}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all"
            style={{ backgroundColor: filtreSecteur === "tous" ? "#FF6FB5" : "white", borderColor: filtreSecteur === "tous" ? "#1D1836" : "rgba(29,24,54,0.15)", color: "#1D1836" }}>
            Tous
          </button>
          {secteurs.slice(0, 8).map(s => (
            <button key={s} onClick={() => setFiltreSecteur(s)}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-black border-2 transition-all capitalize"
              style={{ backgroundColor: filtreSecteur === s ? "#FF6FB5" : "white", borderColor: filtreSecteur === s ? "#1D1836" : "rgba(29,24,54,0.15)", color: "#1D1836" }}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6A00" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2" style={{ borderColor: "rgba(29,24,54,0.08)" }}>
            <div className="text-4xl mb-3">👥</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>Aucun profil trouvé</h2>
            <p className="text-sm mb-4" style={{ color: "#1D1836", opacity: 0.6 }}>Soyez le premier à créer votre profil rencontre pro !</p>
            <Link to="/se-connecter" className="inline-block text-white font-black py-3 px-6 rounded-2xl text-sm" style={{ backgroundColor: "#FF6A00" }}>
              Créer mon profil
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(profile => (
              <div key={profile.id} className="bg-white rounded-2xl border-2 p-5 hover:shadow-md transition-all flex flex-col gap-3"
                style={{ borderColor: "rgba(29,24,54,0.08)" }}>
                <div className="flex items-center gap-3">
                  {profile.photo_url ? (
                    <img loading="lazy" src={profile.photo_url} alt={profile.prenom}
                      className="w-12 h-12 rounded-full object-cover border-2"
                      style={{ borderColor: "#FF6FB5" }} />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white"
                      style={{ backgroundColor: "#FF6FB5" }}>
                      {profile.prenom?.[0] ?? "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-sm" style={{ color: "#1D1836" }}>{profile.prenom}</h3>
                    <p className="text-xs" style={{ color: "#1D1836", opacity: 0.6 }}>{profile.poste}</p>
                  </div>
                </div>

                {profile.entreprise && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#1D1836", opacity: 0.7 }}>
                    <Briefcase className="w-3 h-3" /> {profile.entreprise}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs" style={{ color: "#1D1836", opacity: 0.5 }}>
                  {profile.secteur && <span className="capitalize">{profile.secteur.replace("_", " ")}</span>}
                  {profile.commune && <span><MapPin className="w-3 h-3 inline mr-0.5" />{profile.commune}</span>}
                </div>

                {profile.bio_courte && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#1D1836", opacity: 0.7 }}>{profile.bio_courte}</p>
                )}

                {profile.centres_interet?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.centres_interet.slice(0, 3).map((c, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#FFF8F1", color: "#1D1836", border: "1px solid rgba(29,24,54,0.1)" }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => alert("Connectez-vous pour envoyer une demande de contact.")}
                  className="mt-auto w-full font-black py-2.5 rounded-xl text-sm border-2 transition-all hover:shadow-md"
                  style={{ borderColor: "#FF6FB5", color: "#FF6FB5", backgroundColor: "white" }}>
                  Entrer en contact
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
