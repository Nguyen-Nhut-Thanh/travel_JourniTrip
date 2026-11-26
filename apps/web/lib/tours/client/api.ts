import { publicFetch } from "@/lib/http/publicFetch";
import type { PublicTourDetail, PublicToursQuery, PublicToursResponse } from "shared";

export async function getPublicTours(
  query: PublicToursQuery = {},
): Promise<PublicToursResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if(value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  const path = queryString ? `/tours/public?${queryString}` : "/tours/public";

  return publicFetch<PublicToursResponse>(path, {
    cache: "no-store",
  });
}

export async function getPublicTourDetail(
  tourId: string | number,
): Promise<PublicTourDetail> {
  return publicFetch<PublicTourDetail>(`/tours/public/${tourId}`, {
    cache: "no-store",
  });
}

export async function submitVirtualTryOn(payload: {
  userImage: string;
  costumeId: number;
  preserveBackground?: boolean;
  destinationBackdrop?: string;
}): Promise<{
  success: boolean;
  resultImageUrl: string;
  costumeId: number;
  costumeName: string;
  message: string;
}> {
  return publicFetch("/ai/virtual-tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
