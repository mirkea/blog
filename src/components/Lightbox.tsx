import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom, Navigation, Keyboard } from "swiper/modules";

import "swiper/css";
import "swiper/css/zoom";
import "swiper/css/navigation";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

export default function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="image-gallery-lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="image-gallery-lightbox-close"
        onClick={onClose}
        aria-label="Close full screen image"
      >
        &times;
      </button>
      <Swiper
        modules={[Zoom, Navigation, Keyboard]}
        zoom={{ maxRatio: 4 }}
        navigation={images.length > 1}
        keyboard
        initialSlide={initialIndex}
        spaceBetween={0}
        slidesPerView={1}
        onZoomChange={(_swiper, scale) => setIsZoomed(scale > 1)}
        onSlideChange={() => setIsZoomed(false)}
        className={
          isZoomed ? "image-gallery-lightbox-swiper is-zoomed" : "image-gallery-lightbox-swiper"
        }
      >
        {images.map((image) => (
          <SwiperSlide key={image.src}>
            <div className="swiper-zoom-container">
              <img src={image.src} alt={image.alt} />
            </div>
            {image.caption && <p className="image-gallery-lightbox-caption">{image.caption}</p>}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>,
    document.body,
  );
}
