import type { AdminReviewItem } from "shared";

export type ReviewTourGroup = {
  tourId: number;
  name: string;
  code: string;
  tour: AdminReviewItem["tour"];
  reviews: AdminReviewItem[];
  averageRating: number | null;
};

// Preserve the active review sort order within each tour and between groups.
export function groupReviewsByTour(items: AdminReviewItem[], allItems = items): ReviewTourGroup[] {
  // Tour ratings use all approved reviews, regardless of the active list filters.
  const ratings = new Map<number, { total: number; count: number }>();
  for (const review of allItems) {
    if (review.status !== 1) continue;
    const rating = ratings.get(review.tour_id) ?? { total: 0, count: 0 };
    rating.total += review.rating;
    rating.count += 1;
    ratings.set(review.tour_id, rating);
  }

  const groups = new Map<number, ReviewTourGroup>();
  for (const review of items) {
    const group = groups.get(review.tour_id);
    if (group) group.reviews.push(review);
    else {
      const rating = ratings.get(review.tour_id);
      groups.set(review.tour_id, {
        tourId: review.tour_id,
        name: review.tour_name,
        code: review.tour_code,
        tour: review.tour,
        reviews: [review],
        averageRating: rating ? rating.total / rating.count : null,
      });
    }
  }
  return [...groups.values()];
}
