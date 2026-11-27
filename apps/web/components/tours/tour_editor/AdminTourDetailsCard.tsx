"use client";

import { Sparkles } from 'lucide-react';
import type { TourDetailForm, TourDetailsCardProps } from 'shared';
import { TourAmenitiesEditor } from "@/components/tours/tour_editor/AdminTourAmenitiesEditor";
import { TourEditorCard } from "@/components/tours/tour_editor/AdminTourEditorCard";

export function TourDetailsCard<T extends TourDetailForm>({
  tour,
  onTourChange,
}: {
  tour: T;
  onTourChange: (updater: (prev: T) => T) => void;
}) {
  return (
    <TourEditorCard
      id="tour-amenities"
      title="Tiện ích mẫu của tour"
      description="Tiện ích dịch vụ áp dụng chung cho tour (khách sạn, xe đưa đón, bảo hiểm, bữa ăn...)."
      icon={Sparkles}
    >
      <TourAmenitiesEditor
        embedded
        value={tour.tour_amenities || []}
        onChange={(tour_amenities) =>
          onTourChange((prev) => ({ ...prev, tour_amenities }))
        }
      />
    </TourEditorCard>
  );
}
