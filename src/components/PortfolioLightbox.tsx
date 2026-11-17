import { useEffect, useState } from "react";
import Lightbox, { type LightboxImage } from "./Lightbox";

// Opens the blog's Swiper lightbox for the portfolio screenshots: every image of one project is one gallery.
export default function PortfolioLightbox() {
  const [active, setActive] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const shot = (e.target as HTMLElement).closest<HTMLElement>(".portfolio .shot");
      if (!shot) return;
      const group = shot.closest("section");
      const shots = Array.from(group?.querySelectorAll<HTMLElement>(".shot") ?? [shot]);
      const seen = new Set<string>();
      const images: LightboxImage[] = [];
      shots.forEach((s) => {
        const src = s.dataset.full;
        if (!src || seen.has(src)) return;
        seen.add(src);
        images.push({ src, alt: s.querySelector("img")?.alt ?? "" });
      });
      const index = Math.max(0, images.findIndex((i) => i.src === shot.dataset.full));
      setActive({ images, index });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!active) return null;
  return <Lightbox images={active.images} initialIndex={active.index} onClose={() => setActive(null)} />;
}
