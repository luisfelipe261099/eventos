/**
 * Marca Casa Cheia: símbolo (casa com gente dentro) + nome em letra de cartaz.
 * SVG puro, sem depender de imagem, para ficar nítido em qualquer tela.
 */
export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#8B2CF5" />
      <path d="M16 6.5 26 14.6V25a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 6 25V14.6Z" fill="#fff" />
      <circle cx="11.6" cy="20.6" r="2.3" fill="#8B2CF5" />
      <circle cx="16" cy="18.4" r="2.3" fill="#8B2CF5" />
      <circle cx="20.4" cy="20.6" r="2.3" fill="#8B2CF5" />
    </svg>
  );
}

export function BrandLogo({ h = 32, className = "" }: { h?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-white ${className}`} aria-label="Casa Cheia">
      <BrandMark size={h} />
      <span className="poster whitespace-nowrap uppercase leading-none" style={{ fontSize: h * 0.78 }} aria-hidden>Casa Cheia</span>
    </span>
  );
}
