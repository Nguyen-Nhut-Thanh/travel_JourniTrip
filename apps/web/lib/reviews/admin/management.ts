import type { AdminReviewItem } from "shared";

export type ReviewTourGroup = {
  tourId: number;
  name: string;
  code: string;
  tour: AdminReviewItem["tour"];
  reviews: AdminReviewItem[];
};

// Preserve the active review sort order within each tour and between groups.
export function groupReviewsByTour(items: AdminReviewItem[]): ReviewTourGroup[] {
  const groups = new Map<number, ReviewTourGroup>();
  for (const review of items) {
    const group = groups.get(review.tour_id);
    if (group) group.reviews.push(review);
    else groups.set(review.tour_id, {
      tourId: review.tour_id,
      name: review.tour_name,
      code: review.tour_code,
      tour: review.tour,
      reviews: [review],
    });
  }
  return [...groups.values()];
}
