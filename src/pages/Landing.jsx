import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, TrendingUp, Users, Shield, Zap, Sparkles } from "lucide-react";
import { emitSignal } from "@/lib/emitSignal";

/**
 * LANDING — Adaptive Funnel "Gateway to Territorial OS"
 * Hero ROI Mairie · Simulateur ETP · Segmentation 3 portes · Ghost signals
 */

// ---------- Solarpunk SVG visuals (inline, 0 HTTP) ----------
const SolarMairie = ({ className = "" }) => (
  <svg viewBox="0 0 400 260" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="skyM" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#FFE8B0" /><stop offset="1" stopColor="#FFD84D" />
      </linearGradient>
      <linearGradient id="leafM" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#6FDC8C" /><stop offset="1" stopColor="#1E8F4E" />
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#skyM)" />
    <circle cx="320" cy="70" r="32" fill="#FFF1C0" />
    <path d="M0 200 Q100 170 200 195 T400 185 V260 H0 Z" fill="#1E8F4E" />
    <rect x="130" y="110" width="140" height="100" fill="#FFF8F1" stroke="#1D1836" strokeWidth="3" />
    <polygon points="120,110 280,110 200,55" fill="#1D1836" />
    <rect x="190" y="150" width="20" height="60" fill="#1D1836" />
    <rect x="150" y="130" width="20" height="20" fill="#63C7FF" />
    <rect x="230" y="130" width="20" height="20" fill="#63C7FF" />
    <circle cx="60" cy="220" r="25" fill="url(#leafM)" />
    <circle cx="350" cy="215" r="20" fill="url(#leafM)" />
    <path d="M200 55 L200 30" stroke="#FF6A00" strokeWidth="4" />
    <circle cx="200" cy="28" r="5" fill="#FF6A00" />
  </svg>
);

const SolarEntreprise = ({ className = "" }) => (
  <svg viewBox="0 0 400 260" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="skyE" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#C7E8FF" /><stop offset="1" stopColor="#63C7FF" />
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#skyE)" />
    <path d="M0 210 Q120 180 240 195 T400 200 V260 H0 Z" fill="#2A9D5F" />
    <rect x="70" y="90" width="60" height="120" fill="#FFF8F1" stroke="#1D1836" strokeWidth="3" />
    <rect x="150" y="60" width="70" height="150" fill="#FFD84D" stroke="#1D1836" strokeWidth="3" />
    <rect x="240" y="110" width="70" height="100" fill="#FF6FB5" stroke="#1D1836" strokeWidth="3" />
    {[0,1,2,3].map(i => <rect key={`a${i}`} x={80} y={100 + i*25} width="12" height="12" fill="#63C7FF" />)}
    {[0,1,2,3].map(i => <rect key={`b${i}`} x={105} y={100 + i*25} width="12" height="12" fill="#63C7FF" />)}
    {[0,1,2,3,4,5].map(i => <rect key={`c${i}`} x={160} y={72 + i*22} width="14" height="14" fill="#1D1836" />)}
    {[0,1,2,3,4,5].map(i => <rect key={`d${i}`} x={190} y={72 + i*22} width="14" height="14" fill="#1D1836" />)}
    <circle cx="330" cy="50" r="18" fill="#FFD84D" />
    <path d="M50 215 L50 205 L55 210 L60 200 L65 215" stroke="#FF6A00" strokeWidth="3" fill="none" />
  </svg>
);

const SolarCitoyen = ({ className = "" }) => (
  <svg viewBox="0 0 400 260" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="skyC" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#FFD1E8" /><stop offset="1" stopColor="#FF6FB5" />
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#skyC)" />
    <path d="M0 195 Q80 175 160 185 T320 180 T400 190 V260 H0 Z" fill="#1E8F4E" />
    <circle cx="150" cy="150" r="22" fill="#FFE8B0" stroke="#1D1836" strokeWidth="3" />
    <path d="M128 200 Q150 170 172 200 L172 230 L128 230 Z" fill="#FFD84D" stroke="#1D1836" strokeWidth="3" />
    <circle cx="230" cy="150" r="22" fill="#C7E8FF" stroke="#1D1836" strokeWidth="3" />
    <path d="M208 200 Q230 170 252 200 L252 230 L208 230 Z" fill="#63C7FF" stroke="#1D1836" strokeWidth="3" />
    <circle cx="310" cy="150" r="22" fill="#FFD1E8" stroke="#1D1836" strokeWidth="3" />
    <path d="M288 200 Q310 170 332 200 L332 230 L288 230 Z" fill="#FF6FB5" stroke="#1D1836" strokeWidth="3" />
    <path d="M170 145 L215 145 M250 145 L295 145" stroke="#1D1836" strokeWidth="2" strokeDasharray="3 3" />
    <circle cx="60" cy="80" r="25" fill="#FFF1C0" />
  </svg>
);

const SolarOS = ({ className = "" }) => (
  <svg viewBox="0 0 400 260" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="skyO" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#1D1836" /><stop offset="1" stopColor="#3B2A6B" />
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#skyO)" />
    <circle cx="200" cy="130" r="60" fill="none" stroke="#FFD84D" strokeWidth="3" />
    <circle cx="200" cy="130" r="40" fill="none" stroke="#FF6FB5" strokeWidth="2" />
    <circle cx="200" cy="130" r="20" fill="#FF6A00" />
    <circle cx="200" cy="70" r="8" fill="#63C7FF" />
    <circle cx="260" cy="130" r="8" fill="#FFD84D" />
    <circle cx="200" cy="190" r="8" fill="#6FDC8C" />
    <circle cx="140" cy="130" r="8" fill="#FF6FB5" />
    {Array.from({length: 40}).map((_, i) => (
      <circle key={i} cx={(i*37)%400} cy={(i*53)%260} r="1" fill="#FFF" opacity="0.5" />
    ))}
  </svg>
);

// ---------- Ghost instrumentation (IntersectionObserver -> emitSignal) ----------
function useGhostSignal(ref, sectionId, tags) {
  useEffect(() => {
    if (!ref.current) return;
    let fired = false;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired) {
        fired = true;
        emitSignal({
          type: "consulte",
          target_type: "landing_section",
          target_id: sectionId,
          topic_tags: tags,
          weight: 0.1,
        });
      }
    }, { threshold: 0.5 });
    obs.observe(ref.current);
    return () => obs.disconnect();
    // eslint-disable-next-line
  }, []);
}

// ---------- Simulateur Mairie ----------
function SimulateurMairie() {
  const [hab, setHab] = useState(2500);
  const [dossiers, setDossiers] = useState(40);
  const minutesParMois = dossiers * 15;
  const heuresAn = (minutesParMois * 12) / 60;
  const etpSaved = heuresAn / 1607;
  const euroSaved = Math.round(etpSaved * 42000);
  const timeSaved = Math.round(etpSaved * 10) / 10;

  return (
    <div className="rounded-3xl p-6 md:p-8 border-4 shadow-[6px_6px_0_0_#1D1836]"
      style={{ backgroundColor: "#FFF8F1", borderColor: "#1D1836" }}>
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5" style={{ color: "#FF6A00" }} />
        <h3 className="text-xl md:text-2xl font-black" style={{ color: "#1D1836" }}>
          Combien votre mairie va économiser
        </h3>
      </div>
      <div className="space-y-5">
        <div>
          <label className="text-sm font-bold block mb-2" style={{ color: "#1D1836" }}>
            Population : <span className="font-black">{hab.toLocaleString("fr-FR")} hab.</span>
          </label>
          <input type="range" min="500" max="15000" step="500" value={hab}
            onChange={(e) => setHab(Number(e.target.value))}
            className="w-full accent-orange-500" />
        </div>
        <div>
          <label className="text-sm font-bold block mb-2" style={{ color: "#1D1836" }}>
            Dossiers citoyens / mois : <span className="font-black">{dossiers}</span>
          </label>
          <input type="range" min="5" max="300" step="5" value={dossiers}
            onChange={(e) => setDossiers(Number(e.target.value))}
            className="w-full accent-orange-500" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-3 text-center border-2" style={{ backgroundColor: "#FFD84D", borderColor: "#1D1836" }}>
          <div className="text-xs font-bold" style={{ color: "#1D1836" }}>ETP libéré</div>
          <div className="text-2xl font-black" style={{ color: "#1D1836" }}>{timeSaved}</div>
        </div>
        <div className="rounded-2xl p-3 text-center border-2" style={{ backgroundColor: "#6FDC8C", borderColor: "#1D1836" }}>
          <div className="text-xs font-bold" style={{ color: "#1D1836" }}>€ / an</div>
          <div className="text-xl font-black" style={{ color: "#1D1836" }}>{euroSaved.toLocaleString("fr-FR")}</div>
        </div>
        <div className="rounded-2xl p-3 text-center border-2" style={{ backgroundColor: "#FF6FB5", borderColor: "#1D1836" }}>
          <div className="text-xs font-bold" style={{ color: "#1D1836" }}>Coût / mois</div>
          <div className="text-2xl font-black" style={{ color: "#1D1836" }}>230€</div>
        </div>
      </div>
      <p className="text-xs mt-4 opacity-70" style={{ color: "#1D1836" }}>
        Estimation : 15min/dossier, 1 ETP = 1607h/an, 42k€ chargé.
      </p>
      <Link to="/mairie-candidature"
        onClick={() => emitSignal({ type: "consulte", target_type: "landing_cta", target_id: "simu_cta", topic_tags: ["mairie","roi"], weight: 0.3 })}
        className="mt-5 inline-flex items-center gap-2 w-full justify-center rounded-2xl px-5 py-3 font-black border-2 shadow-[4px_4px_0_0_#1D1836] transition-transform hover:translate-y-[-2px]"
        style={{ backgroundColor: "#FF6A00", color: "#FFF", borderColor: "#1D1836" }}>
        Activer ma mairie <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function SegmentCard({ title, baseline, bullets, cta, to, color, Visual, signalTag }) {
  return (
    <div className="rounded-3xl overflow-hidden border-4 shadow-[6px_6px_0_0_#1D1836] flex flex-col"
      style={{ backgroundColor: "#FFF8F1", borderColor: "#1D1836" }}>
      <Visual className="w-full h-40" />
      <div className="p-6 flex-1 flex flex-col">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black mb-3 self-start border-2"
          style={{ backgroundColor: color, borderColor: "#1D1836", color: "#1D1836" }}>
          {title}
        </div>
        <h3 className="text-xl font-black mb-2" style={{ color: "#1D1836" }}>{baseline}</h3>
        <ul className="space-y-1.5 text-sm mb-5" style={{ color: "#1D1836" }}>
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#1E8F4E" }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link to={to}
          onClick={() => emitSignal({ type: "consulte", target_type: "landing_cta", target_id: `segment_${signalTag}`, topic_tags: [signalTag], weight: 0.3 })}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-black border-2 shadow-[3px_3px_0_0_#1D1836] transition-transform hover:translate-y-[-2px]"
          style={{ backgroundColor: "#1D1836", color: "#FFF", borderColor: "#1D1836" }}>
          {cta} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function Landing() {
  const heroRef = useRef(null);
  const simuRef = useRef(null);
  const segRef = useRef(null);
  const trustRef = useRef(null);

  useGhostSignal(heroRef, "hero", ["mairie", "roi"]);
  useGhostSignal(simuRef, "simulateur", ["mairie", "simulateur", "roi"]);
  useGhostSignal(segRef, "segments", ["mairie", "entreprise", "citoyen"]);
  useGhostSignal(trustRef, "trust", ["rgpd", "souverainete"]);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF8F1" }}>
      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden border-b-4" style={{ backgroundColor: "#1D1836", borderColor: "#1D1836" }}>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <SolarOS className="w-full h-full" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black mb-5 border-2"
              style={{ backgroundColor: "#FFD84D", borderColor: "#FFD84D", color: "#1D1836" }}>
              ⚡ Territorial OS · Pévèle
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.05] text-white mb-5">
              Économisez <span style={{ color: "#FFD84D" }}>1,7 ETP</span><br />
              dès le 1<sup>er</sup> mois.
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-7 max-w-xl">
              Le premier OS territorial qui unifie citoyens, entreprises et mairie
              sur un seul graphe. Zéro formulaire. Une décision IA à la fois.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/mairie-candidature"
                onClick={() => emitSignal({ type: "consulte", target_type: "landing_cta", target_id: "hero_mairie", topic_tags: ["mairie","hero"], weight: 0.4 })}
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-black border-2 shadow-[4px_4px_0_0_#FFD84D] transition-transform hover:translate-y-[-2px]"
                style={{ backgroundColor: "#FF6A00", color: "#FFF", borderColor: "#FFD84D" }}>
                Je suis Maire <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/agir"
                onClick={() => emitSignal({ type: "consulte", target_type: "landing_cta", target_id: "hero_citoyen", topic_tags: ["citoyen","hero"], weight: 0.3 })}
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-black border-2 transition-transform hover:translate-y-[-2px]"
                style={{ backgroundColor: "#FFF", color: "#1D1836", borderColor: "#FFF" }}>
                Je suis citoyen
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-white/70">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Hébergé 🇫🇷</div>
              <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> RGPD natif</div>
              <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Zéro install</div>
            </div>
          </div>
          <div ref={simuRef}>
            <SimulateurMairie />
          </div>
        </div>
      </section>

      {/* SEGMENTS */}
      <section ref={segRef} className="py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black mb-3 border-2"
              style={{ backgroundColor: "#FFD84D", borderColor: "#1D1836", color: "#1D1836" }}>
              3 portes d'entrée · 1 seul graphe
            </div>
            <h2 className="text-3xl md:text-5xl font-black" style={{ color: "#1D1836" }}>
              Un OS. Trois parcours.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <SegmentCard
              title="🏛 MAIRIE"
              baseline="Gouvernez en temps réel"
              bullets={["Dossiers citoyens triés par l'IA", "1,7 ETP libéré dès le 1er mois", "Observatoire territorial live"]}
              cta="Pack Mairie 230€/mois"
              to="/mairie-candidature"
              color="#FFD84D"
              Visual={SolarMairie}
              signalTag="mairie"
            />
            <SegmentCard
              title="🏢 ENTREPRISE"
              baseline="Captez vos clients locaux"
              bullets={["Marketplace géo-ciblée", "Sponsoring hyper-local 49€/mois", "Flash Date Pro · 7 min"]}
              cta="Devenir sponsor"
              to="/sponsor"
              color="#63C7FF"
              Visual={SolarEntreprise}
              signalTag="entreprise"
            />
            <SegmentCard
              title="👥 CITOYEN"
              baseline="Agissez pour votre commune"
              bullets={["Signalez en 30 secondes", "Suivez les dossiers en live", "Place du Village connectée"]}
              cta="Agir maintenant"
              to="/agir"
              color="#FF6FB5"
              Visual={SolarCitoyen}
              signalTag="citoyen"
            />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section ref={trustRef} className="py-16 px-5 md:px-8 border-t-4" style={{ backgroundColor: "#FFD84D", borderColor: "#1D1836" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black mb-2" style={{ color: "#1D1836" }}>
              Pourquoi ça marche
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { Icon: TrendingUp, t: "312% ROI", d: "dès le 1er mois sur le Pack Mairie" },
              { Icon: Users, t: "10 000+ users", d: "architecture edge-ready, cache 15min" },
              { Icon: Shield, t: "RGPD natif", d: "hébergé en France, export 1-clic" },
            ].map(({ Icon, t, d }, i) => (
              <div key={i} className="rounded-3xl p-5 border-4 shadow-[4px_4px_0_0_#1D1836]"
                style={{ backgroundColor: "#FFF8F1", borderColor: "#1D1836" }}>
                <Icon className="w-7 h-7 mb-2" style={{ color: "#FF6A00" }} />
                <div className="text-xl font-black" style={{ color: "#1D1836" }}>{t}</div>
                <div className="text-sm mt-1" style={{ color: "#1D1836" }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 md:py-24 px-5 md:px-8" style={{ backgroundColor: "#1D1836" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5">
            Votre commune mérite mieux qu'un PDF.
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Activez votre OS territorial en moins de 24h. Annulable à tout moment.
          </p>
          <Link to="/mairie-candidature"
            onClick={() => emitSignal({ type: "consulte", target_type: "landing_cta", target_id: "final_mairie", topic_tags: ["mairie","final"], weight: 0.5 })}
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-black border-2 shadow-[6px_6px_0_0_#FFD84D]"
            style={{ backgroundColor: "#FF6A00", color: "#FFF", borderColor: "#FFD84D" }}>
            Activer ma mairie <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-5 border-t-2" style={{ backgroundColor: "#FFF8F1", borderColor: "#1D1836" }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs" style={{ color: "#1D1836" }}>
          <div>© {new Date().getFullYear()} La Pévèle Augmentée · Vivien Le Moal · Bourghelles · SIREN 835125089</div>
          <div className="flex gap-4">
            <Link to="/mentions-legales" className="underline">Mentions</Link>
            <Link to="/rgpd" className="underline">RGPD</Link>
            <Link to="/cookies" className="underline">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
