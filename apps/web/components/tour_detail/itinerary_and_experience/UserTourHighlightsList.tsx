"use client";

import { Award, CheckCircle2 } from "lucide-react";
import type { TourHighlightsListProps } from 'shared';

export default function TourHighlightsList({ highlights = [] }: TourHighlightsListProps) {
  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[14px] border border-[#e1edfc] bg-white p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
          <Award className="h-4 w-4" />
        </div>
        <h2 className="text-[17px] sm:text-lg font-bold text-[#0b1747]">Điểm nổi bật của chương trình</h2>
      </div>

      <div className="space-y-2.5">
        {highlights.map((text, idx) => (
          <div key={idx} className="flex items-start gap-3 rounded-xl bg-slate-50/60 p-3 border border-slate-100/80">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#075bff] mt-0.5" />
            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
