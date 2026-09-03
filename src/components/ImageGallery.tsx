import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import Lightbox from "./Lightbox";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="image-gallery not-prose my-6">
      <Swiper
        modules={[Navigation, Pagination]}
        navigation
        pagination={{ clickable: true }}
        spaceBetween={16}
        slidesPerView={1.5}
        breakpoints={{
          640: { slidesPerView: images.length >= 3 ? 2.2 : images.length, spaceBetween: 16 },
          1024: { slidesPerView: Math.min(images.length, 3), spaceBetween: 20 },
        }}
        className="image-gallery-swiper"
      >
        {images.map((image, i) => (
          <SwiperSlide key={image.src}>
            <button
              type="button"
              className="image-gallery-thumb-button"
              onClick={() => setLightboxIndex(i)}
              aria-label={`Open ${image.alt} full screen`}
            >
              <img src={image.src} alt={image.alt} loading="lazy" />
            </button>
            {image.caption && <p className="image-gallery-caption">{image.caption}</p>}
          </SwiperSlide>
        ))}
      </Swiper>

      {mounted && lightboxIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
