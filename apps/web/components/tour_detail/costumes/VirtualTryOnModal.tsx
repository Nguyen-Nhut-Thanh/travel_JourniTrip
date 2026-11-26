"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, X, Upload, Camera, ArrowRight, RotateCcw, 
  Download, Check, AlertCircle, Shirt, Loader2, Image as ImageIcon, SlidersHorizontal
} from "lucide-react";
import type { TourCostume } from "shared";
import { submitVirtualTryOn } from "@/lib/tours/client/api";

interface VirtualTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  costume: TourCostume | null;
  tourName: string;
  allCostumes?: TourCostume[];
  onSelectCostume?: (c: TourCostume) => void;
}

// Sample portraits for quick testing without needing to find a photo
const SAMPLE_PORTRAITS = [
  {
    name: "Mẫu Nữ (Á Châu)",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Mẫu Nam (Á Châu)",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Chân Dung Ngoại Cảnh",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  },
];

const LOADING_STEPS = [
  "Đang nhận diện khuôn mặt và tỷ lệ cơ thể...",
  "Đang căn chỉnh hoa văn trang phục truyền thống...",
  "Đang kết nối model gpt-image-2.6-sunburst...",
  "Đang dệt nếp gấp vải và xử lý ánh sáng chân thực...",
  "Đang hoàn thiện bức ảnh thử đồ của bạn...",
];

export default function VirtualTryOnModal({
  isOpen,
  onClose,
  costume,
  tourName,
  allCostumes = [],
  onSelectCostume,
}: VirtualTryOnModalProps) {
  const [selectedCostume, setSelectedCostume] = useState<TourCostume | null>(costume);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [preserveBackground, setPreserveBackground] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (costume) {
      setSelectedCostume(costume);
    }
  }, [costume]);

  // Loading animation stepper
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setCurrentStepIndex(0);
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen || !selectedCostume) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Vui lòng chọn đúng định dạng hình ảnh (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Kích thước ảnh tối đa là 10MB.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setUserImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartTryOn = async () => {
    if (!userImage) {
      setErrorMsg("Vui lòng tải lên ảnh cá nhân hoặc chọn ảnh mẫu trước khi thử đồ.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setResultImage(null);

    try {
      const res = await submitVirtualTryOn({
        userImage,
        costumeId: selectedCostume.costume_id,
        preserveBackground,
        destinationBackdrop: !preserveBackground ? tourName : undefined,
      });

      if (res.success && res.resultImageUrl) {
        setResultImage(res.resultImageUrl);
      } else {
        throw new Error(res.message || "Không thể tạo ảnh thử đồ.");
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Hệ thống AI đang bận hoặc quá tải. Quý khách vui lòng thử lại sau ít phút!"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `JourniTrip_TryOn_${selectedCostume.name.replace(/\s+/g, "_")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Phòng Thử Đồ Ảo AI</h3>
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                  gpt-image-2.6-sunburst
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Thử trang phục truyền thống của tour <span className="font-medium text-slate-700">{tourName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Costume Selector if multiple costumes exist */}
          {allCostumes.length > 1 && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Chọn trang phục địa phương khác trong tour:
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allCostumes.map((c) => (
                  <button
                    key={c.costume_id}
                    type="button"
                    onClick={() => {
                      setSelectedCostume(c);
                      onSelectCostume?.(c);
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition shrink-0 ${
                      selectedCostume.costume_id === c.costume_id
                        ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Shirt className="h-3.5 w-3.5" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main 2-Column Section: Left (Selected Costume & Upload) - Right (Interactive Preview / Result) */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            
            {/* Left Column: Costume Info & User Photo Input (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              
              {/* Selected Costume Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 flex gap-3.5 items-center">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                  <img
                    src={selectedCostume.image_url}
                    alt={selectedCostume.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                    {selectedCostume.gender === "female" ? "Nữ" : selectedCostume.gender === "male" ? "Nam" : "Unisex"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{selectedCostume.name}</h4>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                    {selectedCostume.description || "Trang phục truyền thống mang đậm bản sắc văn hóa địa phương."}
                  </p>
                  {selectedCostume.rental_price && (
                    <p className="mt-1 text-xs font-semibold text-amber-600">
                      Thuê trải nghiệm: {Number(selectedCostume.rental_price).toLocaleString("vi-VN")} đ
                    </p>
                  )}
                </div>
              </div>

              {/* Upload User Photo Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-sky-600" />
                    Ảnh của bạn
                  </span>
                  {userImage && (
                    <button
                      type="button"
                      onClick={() => setUserImage(null)}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Đổi ảnh khác
                    </button>
                  )}
                </div>

                {!userImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition hover:border-sky-400 hover:bg-sky-50/20"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 group-hover:scale-105 transition text-sky-600">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-700">Tải ảnh chân dung hoặc toàn thân</p>
                    <p className="mt-1 text-[11px] text-slate-400">Rõ khuôn mặt, đủ sáng để AI xử lý đẹp nhất (Tối đa 10MB)</p>
                  </div>
                ) : (
                  <div className="relative aspect-[3/4] max-h-52 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img src={userImage} alt="User portrait" className="h-full w-full object-cover" />
                    <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur-xs flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-400" /> Ảnh sẵn sàng
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Quick Sample Presets */}
                {!userImage && (
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1.5">Hoặc thử nhanh với ảnh mẫu:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {SAMPLE_PORTRAITS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setUserImage(p.url)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 hover:border-sky-300 transition text-left group"
                        >
                          <img src={p.url} alt={p.name} className="h-7 w-7 rounded-lg object-cover" />
                          <span className="text-[10px] font-medium text-slate-600 line-clamp-1">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" /> Tùy chọn phông nền
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="radio"
                    name="bg_option"
                    checked={preserveBackground}
                    onChange={() => setPreserveBackground(true)}
                    className="accent-sky-600"
                  />
                  <span>Giữ nguyên phông nền ảnh gốc</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="radio"
                    name="bg_option"
                    checked={!preserveBackground}
                    onChange={() => setPreserveBackground(false)}
                    className="accent-sky-600"
                  />
                  <span>Ghép cảnh đẹp điểm đến ({tourName.slice(0, 25)}...)</span>
                </label>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={!userImage || isGenerating}
                onClick={handleStartTryOn}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Bắt đầu Thử đồ với AI</span>
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Right Column: Preview / Comparison / Result (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-center min-h-[380px] rounded-2xl border border-slate-200 bg-slate-900/5 p-4 overflow-hidden relative">
              
              {/* State 1: Generating Loading Animation */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-sky-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Đang dệt trang phục bằng AI</h4>
                    <p className="mt-1 text-xs text-sky-600 font-medium animate-pulse min-h-[20px]">
                      {LOADING_STEPS[currentStepIndex]}
                    </p>
                  </div>
                  <div className="w-full max-w-xs bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full transition-all duration-700" 
                      style={{ width: `${((currentStepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mô hình gpt-image-2.6-sunburst đang tái tạo nếp vải và khuôn mặt với độ phân giải cao
                  </p>
                </div>
              )}

              {/* State 2: Result Comparison (Before / After) */}
              {!isGenerating && resultImage && userImage && (
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Check className="h-4 w-4 text-emerald-600" /> Kết quả thử đồ hoàn tất
                    </span>
                    <span className="text-slate-400">Kéo thanh trượt để so sánh Trước / Sau</span>
                  </div>

                  {/* Interactive Split / Slider View */}
                  <div className="relative flex-1 min-h-[300px] w-full select-none overflow-hidden rounded-2xl border border-slate-200 bg-black">
                    {/* After Image (Background) */}
                    <img
                      src={resultImage}
                      alt="After AI Try-on"
                      className="absolute inset-0 h-full w-full object-contain"
                    />

                    {/* Before Image (Clipped Overlay) */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${sliderPosition}%` }}
                    >
                      <img
                        src={userImage}
                        alt="Before photo"
                        className="absolute inset-0 h-full w-full object-contain max-w-none"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>

                    {/* Divider Line & Handle */}
                    <div
                      className="absolute bottom-0 top-0 w-0.5 bg-white shadow-md z-10 cursor-ew-resize"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg text-slate-700 text-[10px] font-bold">
                        ↔
                      </div>
                    </div>

                    {/* Draggable range input */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderPosition}
                      onChange={(e) => setSliderPosition(Number(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-ew-resize z-20 w-full h-full"
                    />

                    {/* Badges */}
                    <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                      Ảnh gốc
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-lg bg-sky-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                      AI Thử Đồ
                    </span>
                  </div>

                  {/* Result Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Tải ảnh về</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultImage(null)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Thử lại</span>
                      </button>
                    </div>

                    {selectedCostume.rental_price && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          // Scroll to departure/booking card
                          const bookCard = document.getElementById("booking-card-section");
                          if (bookCard) {
                            bookCard.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
                      >
                        <span>Thuê trang phục khi đặt tour này</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* State 3: Empty / Initial Guide View */}
              {!isGenerating && !resultImage && (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm border border-slate-100 text-sky-500">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Xem trước ảnh thử đồ của bạn tại đây</h4>
                  <p className="max-w-xs text-xs text-slate-500 leading-relaxed">
                    Tải ảnh chân dung của bạn ở cột bên trái và bấm <span className="font-semibold text-slate-700">&quot;Bắt đầu Thử đồ với AI&quot;</span>. Model <span className="font-medium text-sky-600">gpt-image-2.6-sunburst</span> sẽ giữ trọn diện mạo khuôn mặt và khoác lên bạn bộ trang phục truyền thống tinh xảo.
                  </p>
                </div>
              )}

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
