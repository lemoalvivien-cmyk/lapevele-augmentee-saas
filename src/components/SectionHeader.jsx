export default function SectionHeader({ emoji, title, subtitle, accentColor = "#FF6A00" }) {
  return (
    <div className="flex items-start gap-4 pb-4 mb-6 border-b-2 border-ink/8">
      <div className="w-10 h-10 rounded-xl bg-white border-2 border-ink/10 shadow-sm flex items-center justify-center text-xl shrink-0">
        {emoji}
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-black leading-snug" style={{ color: "#1D1836" }}>{title}</h2>
        {subtitle && (
          <p className="text-sm font-medium mt-0.5" style={{ color: "#1D1836", opacity: 0.55 }}>{subtitle}</p>
        )}
        <div className="h-1 w-10 rounded-full mt-2" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}