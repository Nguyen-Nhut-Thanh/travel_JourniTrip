"use client";

import React, { useState } from "react";
import { Sparkles, Shirt, Eye, ChevronRight, Sparkle } from "lucide-react";
import type { TourCostume } from "shared";
import VirtualTryOnModal from "./VirtualTryOnModal";

interface UserTourCostumesSectionProps {
  costumes?: TourCostume[];
  tourName: string;
}

export default function UserTourCostumesSection({
  costumes,
  tourName,
}: UserTourCostumesSectionProps) {
  const [selectedCostume, setSelectedCostume] = useState<TourCostume | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If no costumes assigned to this tour, do not render this section
  if (!costumes || costumes.length === 0) {
    return null;
  }

  const handleOpenTryOn = (costume: TourCostume) => {
    setSelectedCostume(costume);
    setIsModalOpen(true);
  };

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative">
      {/* Background soft decorative gradient */}
      <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-gradient-to-br from-sky-100/60 to-indigo-100/40 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-sky-500/20">
            <Shirt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Trang phục địa phương trải nghiệm</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500/10 to-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-700 border border-sky-200/50">
                <Sparkles className="h-3 w-3 text-sky-600" /> AI Virtual Try-On
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khám phá trang phục truyền thống của điểm đến & thử đồ ảo tức thì cùng AI với ảnh cá nhân của bạn
            </p>
          </div>
        </div>
      </div>

      {/* Costumes Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {costumes.map((costume) => {
          const genderBadge =
            costume.gender === "female"
              ? "Dành cho Nữ"
              : costume.gender === "male"
              ? "Dành cho Nam"
              : "Phù hợp Nam & Nữ";

          return (
            <div
              key={costume.costume_id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/50 transition duration-200 hover:-translate-y-1 hover:border-sky-300 hover:bg-white hover:shadow-md"
            >
              {/* Costume Thumbnail */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200">
                <img
                  src={costume.image_url}
                  alt={costume.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                {/* Gender Tag */}
                <span className="absolute top-2.5 left-2.5 rounded-lg bg-black/50 backdrop-blur-xs px-2 py-1 text-[10px] font-semibold text-white">
                  {genderBadge}
                </span>

                {/* Rental price tag if available */}
                {costume.rental_price && (
                  <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-amber-500/90 backdrop-blur-xs px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                    Thuê: {Number(costume.rental_price).toLocaleString("vi-VN")} đ
                  </span>
                )}
              </div>

              {/* Details & CTA */}
              <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-sky-700 transition line-clamp-1">
                    {costume.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {costume.description || "Nét đẹp trang phục truyền thống đặc trưng mang đậm bản sắc văn hóa điểm đến."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenTryOn(costume)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-600/20 transition hover:from-sky-500 hover:to-indigo-500 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Thử đồ cùng AI</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thử đồ */}
      <VirtualTryOnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        costume={selectedCostume}
        tourName={tourName}
        allCostumes={costumes}
        onSelectCostume={(c) => setSelectedCostume(c)}
      />
    </section>
  );
}
