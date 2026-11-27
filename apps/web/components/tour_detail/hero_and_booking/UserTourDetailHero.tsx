"use client";

import { Dialog } from "@/components/common/dialogs_and_feedback/dialogs/Dialog";
import { PLACEHOLDER_IMAGE } from "@/lib/utils/images";
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { TourDetailHeroProps } from 'shared';

export default function TourDetailHero({ tour }: TourDetailHeroProps) {
  const galleryTitleId = useId();
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);

  const images =
    tour.tour_images && tour.tour_images.length > 0
      ? tour.tour_images.map((img) => img.image_url)
      : [PLACEHOLDER_IMAGE];

  const mainImage = images[activeImageIndex] || images[0];

  const scrollThumbnails = (direction: "left" | "right") => {
    thumbnailScrollRef.current?.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-4">
      {/* Media Gallery Section */}
      <div className="space-y-3">
        {/* Featured Main Image Container */}
        <div
          onClick={() => setIsGalleryModalOpen(true)}
          className="relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden rounded-[14px] bg-slate-900 shadow-sm group cursor-pointer"
        >
          <Image
            src={mainImage}
            alt={tour.name}
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 1280px) 100vw, 800px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Top Left Badge */}
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
            <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
            <span>Hình ảnh thực tế</span>
          </div>

          <div className="absolute bottom-4 left-4 z-10 text-white">
            <p className="text-xs uppercase tracking-wider text-white/80 font-bold">Hành trình tuyệt đẹp</p>
            <p className="text-sm sm:text-base font-extrabold drop-shadow">{tour.name}</p>
          </div>
        </div>

        {/* Thumbnail strip: click to replace main image, scroll horizontally when many */}
        <div className="group/thumbnails relative">
          {images.length > 5 && (
            <>
              <button
                type="button"
                aria-label="Cuộn ảnh sang trái"
                onClick={() => scrollThumbnails("left")}
                className="absolute left-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-white hover:text-sky-600 sm:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                aria-label="Cuộn ảnh sang phải"
                onClick={() => scrollThumbnails("right")}
                className="absolute right-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-white hover:text-sky-600 sm:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div
            ref={thumbnailScrollRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 sm:gap-3"
          >
            {images.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                aria-label={`Xem ảnh ${idx + 1}`}
                className={`relative aspect-[4/3] w-[112px] shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-all sm:w-[150px] ${
                  activeImageIndex === idx
                    ? "border-sky-500 ring-2 ring-sky-200"
                    : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={img}
                  alt={`Ảnh ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full Image Gallery Modal */}
      {isGalleryModalOpen && (
        <Dialog onClose={() => setIsGalleryModalOpen(false)} labelledBy={galleryTitleId} overlayClassName="bg-black/90">
        <div className="flex h-full w-full flex-col sm:p-2">
          <div className="flex items-center justify-between pb-4 text-white">
            <h3 id={galleryTitleId} className="text-lg font-bold">Thư viện ảnh tour ({images.length} ảnh)</h3>
            <button
              type="button"
              aria-label="Đóng thư viện ảnh"
              onClick={() => setIsGalleryModalOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/40"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="custom-scrollbar grid flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  setActiveImageIndex(idx);
                  setIsGalleryModalOpen(false);
                }}
                className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-800 cursor-pointer hover:opacity-90"
              >
                <Image src={img} alt={`Ảnh gallery ${idx + 1}`} fill className="object-cover" sizes="300px" />
              </button>
            ))}
          </div>
        </div>
        </Dialog>
      )}
    </div>
  );
}
