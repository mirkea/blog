import { useEffect, useState } from "react";
import Lightbox, { type LightboxImage } from "./Lightbox";

export default function MarkdownImageLightbox() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<{ image: LightboxImage } | null>(null);

  useEffect(() => {
    setMounted(true);
    const container = document.querySelector(".markdown-content");
    if (!container) return;

    const onClick = (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest("img");
      if (!img || !container.contains(img) || img.closest(".image-gallery")) return;

      setActive({ image: { src: img.currentSrc || img.src, alt: img.alt } });
    };

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, []);

  if (!mounted || !active) return null;

  return (
    <Lightbox images={[active.image]} initialIndex={0} onClose={() => setActive(null)} />
  );
}
