"use client";

import { MapPin, Route } from "lucide-react";
import { useMemo, useState } from "react";
import type { TourSmartMapProps } from "shared";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { TourProvinceNavigation } from "@/components/tours/tour_listing/UserTourProvinceNavigation";

export default function TourSmartMap({
  tour,
  attractions: scheduleAttractions = [],
}: TourSmartMapProps) {
  const [activeProvince, setActiveProvince] = useState<number | null>(null);
  const [orderedAttractions, setOrderedAttractions] = useState<
    Record<number, number[]>
  >({});

  const provinces = [...(tour?.tour_destinations || [])]
    .sort((a, b) => a.visit_order - b.visit_order)
    .map((item) => ({
      id: item.location_id ?? item.locations?.location_id,
      name: item.name || item.locations?.name || "Điểm đến",
    }))
    .filter(
      (item, index, items) =>
        item.id != null &&
        items.findIndex((other) => other.id === item.id) === index,
    )
    .map((item) => ({
      id: item.id!,
      name: item.name,
      count: scheduleAttractions.filter(
        (visit) => visit.location?.parent_id === item.id,
      ).length,
    }));
  const selected =
    provinces.find((item) => item.id === activeProvince) || provinces[0];

  const defaultAttractions = useMemo(() => {
    return [...scheduleAttractions]
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter(
        (item) => item.location && item.location.parent_id === selected?.id,
      );
  }, [scheduleAttractions, selected?.id]);

  const attractions = useMemo(() => {
    if (!selected?.id) return defaultAttractions;
    const order = orderedAttractions[selected.id];
    if (!order || order.length !== defaultAttractions.length)
      return defaultAttractions;

    const itemMap = new Map(
      defaultAttractions.map((item) => [item.location_id, item]),
    );
    const reordered = order
      .map((id) => itemMap.get(id))
      .filter(Boolean) as typeof defaultAttractions;
    if (reordered.length === defaultAttractions.length) {
      return reordered;
    }
    return defaultAttractions;
  }, [defaultAttractions, orderedAttractions, selected?.id]);

  const handleSelectAttraction = (targetLocationId: number) => {
    if (!selected?.id || attractions.length < 2) return;
    const targetIndex = attractions.findIndex(
      (item) => item.location_id === targetLocationId,
    );
    if (targetIndex <= 0) return;

    const currentFeatured = attractions[0];
    const targetItem = attractions[targetIndex];
    const others = attractions
      .slice(1)
      .filter((item) => item.location_id !== targetLocationId);

    const nextList = [targetItem, ...others, currentFeatured];
    setOrderedAttractions((prev) => ({
      ...prev,
      [selected.id]: nextList.map((item) => item.location_id),
    }));
  };

  const [featured, ...otherAttractions] = attractions;
  const featuredLocation = featured?.location;

  return (
    <section className="@container/destinations min-w-0 space-y-4 rounded-[14px] border border-[#e1edfc] bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
          <MapPin className="h-4 w-4" />
        </div>
        <h2 className="text-[17px] sm:text-lg font-bold text-[#0b1747]">
          Khám phá điểm đến
        </h2>
      </div>
      {!selected ? (
        <p className="py-4 text-sm text-[#7387aa]">
          Các điểm đến đang được cập nhật.
        </p>
      ) : (
        <>
          <TourProvinceNavigation
            provinces={provinces}
            selectedId={selected.id}
            onSelect={setActiveProvince}
          />
          <div aria-live="polite" className="space-y-3">
            {featuredLocation ? (
              <div
                key={selected.id}
                className={`grid items-start gap-3 ${otherAttractions.length ? "@[640px]/destinations:grid-cols-[1.15fr_1fr]" : ""}`}
              >
                <article
                  className={`relative isolate overflow-hidden rounded-[14px] bg-slate-100 ${otherAttractions.length ? "aspect-[4/3] @[640px]/destinations:aspect-auto @[640px]/destinations:h-[26rem]" : "aspect-[16/10] max-h-[30rem] sm:aspect-[16/9]"}`}
                >
                  <ImageWithFallback
                    src={featuredLocation.location_images?.[0]?.image_url}
                    alt={featuredLocation.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-white sm:p-6">
                    <h4 className="flex items-start gap-2 text-xl font-bold sm:text-2xl">
                      <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#075bff]" />
                      <span className="min-w-0 break-words">
                        {featuredLocation.name}
                      </span>
                    </h4>
                    <p
                      tabIndex={0}
                      className="no-scrollbar max-h-32 overflow-y-auto whitespace-pre-line break-words rounded text-sm leading-6 text-white/95 focus-visible:outline-2 focus-visible:outline-white"
                    >
                      {featuredLocation.note ||
                        "Thông tin giới thiệu địa điểm đang được cập nhật."}
                    </p>
                  </div>
                </article>
                {otherAttractions.length > 0 && (
                  <div
                    role="region"
                    aria-label={`Các điểm tham quan khác tại ${selected.name}`}
                    tabIndex={0}
                    className="no-scrollbar min-w-0 space-y-1 overflow-y-auto overscroll-y-contain rounded-xl focus-visible:outline-2 focus-visible:outline-[#075bff] @[640px]/destinations:max-h-[26rem]"
                  >
                    {otherAttractions.map((visit) => {
                      const location = visit.location!;
                      return (
                        <button
                          key={visit.location_id}
                          type="button"
                          onClick={() =>
                            handleSelectAttraction(visit.location_id)
                          }
                          title={`Xem điểm tham quan ${location.name}`}
                          className="group grid w-full min-h-24 sm:min-h-28 grid-cols-[0.9fr_1.1fr] gap-2.5 rounded-xl border border-transparent p-1 sm:p-1.5 text-left cursor-pointer transition-all hover:border-[#e1edfc] hover:bg-[#f8fbff] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075bff]"
                        >
                          <span className="relative min-h-24 sm:min-h-28 overflow-hidden rounded-xl bg-slate-100">
                            <ImageWithFallback
                              src={location.location_images?.[0]?.image_url}
                              alt={location.name}
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </span>
                          <span className="min-w-0 py-0.5">
                            <span className="flex items-start gap-1.5 text-sm font-bold text-[#0b1747] transition-colors group-hover:text-[#075bff]">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#075bff]" />
                              <span className="min-w-0 break-words">
                                {location.name}
                              </span>
                            </span>
                            <span className="mt-1 block line-clamp-3 whitespace-pre-line break-words text-xs leading-5 text-[#7387aa]">
                              {location.note ||
                                "Thông tin giới thiệu địa điểm đang được cập nhật."}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[14px] border border-dashed border-[#b9d7fb] bg-[#f8fbff] px-5 py-10 text-center text-sm leading-6 text-[#7387aa]">
                Chưa có điểm tham quan được chọn tại {selected.name} trong lịch
                trình này.
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4 border-t border-[#edf2fb] pt-5 @[640px]/destinations:flex-row @[640px]/destinations:items-center">
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                <Route className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0b1747]">
                  Tuyến hành trình
                </h3>
                <p className="mt-0.5 text-xs text-[#7387aa]">
                  Lộ trình {provinces.length} điểm dừng
                </p>
              </div>
            </div>
            <nav
              aria-label="Tuyến hành trình"
              className="no-scrollbar min-w-0 flex-1 overflow-x-auto overscroll-x-contain py-1"
            >
              <ol className="flex min-w-max">
                {provinces.map((province, index) => (
                  <li
                    key={province.id}
                    className="relative min-w-24 flex-1 px-2 text-center"
                  >
                    {index < provinces.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-2.5 h-0.5 w-full bg-[#b9d7fb]"
                      />
                    )}
                    <button
                      type="button"
                      aria-current={
                        selected.id === province.id ? "step" : undefined
                      }
                      onClick={() => setActiveProvince(province.id)}
                      className="relative flex w-full flex-col items-center gap-2 rounded text-xs focus-visible:outline-2 focus-visible:outline-[#075bff]"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-5 w-5 rounded-full ${selected.id === province.id ? "border-4 border-[#075bff] bg-white ring-2 ring-blue-100" : "border-2 border-white bg-[#dce7f7] ring-1 ring-[#b9d7fb]"}`}
                      />
                      <span
                        className={
                          selected.id === province.id
                            ? "font-bold text-[#075bff]"
                            : "text-[#7387aa] hover:text-[#0b1747]"
                        }
                      >
                        {province.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </>
      )}
    </section>
  );
}
