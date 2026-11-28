import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { boostTourReviews, rollbackBatch } from '../services/data-generator';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  const tour = await prisma.tours.findFirst({
    select: { tour_id: true, name: true, code: true, rating_avg: true, rating_count: true }
  });

  if (!tour) {
    console.log('No tour found in DB.');
    return;
  }

  console.log(`Checking Tour: [${tour.code}] "${tour.name}"`);
  console.log(`Initial rating: ${tour.rating_avg} ⭐ (${tour.rating_count} reviews)`);

  const tag = `TEST-BOOST-${Date.now()}`;
  const res = await boostTourReviews({
    tourId: tour.tour_id,
    count: 3,
    ratingProfile: 'mostly_five',
    includeImages: true,
    includeReplies: true,
    batchTag: tag
  });

  console.log('Boost success:', res.success);
  console.log(`Created: ${res.reviewsCreated} reviews, ${res.repliesCreated} replies`);
  console.log(`New rating: ${res.ratingAvg} ⭐ (${res.ratingCount} reviews)`);

  const sampleReview = await prisma.reviews.findFirst({
    where: { tour_id: tour.tour_id },
    include: { review_replies: true, users: true },
    orderBy: { review_id: 'desc' }
  });

  console.log('Latest review sample:');
  console.log(`- Author: ${sampleReview?.users?.full_name}`);
  console.log(`- Rating: ${sampleReview?.rating} ⭐ | Title: ${sampleReview?.title}`);
  console.log(`- Comment: ${sampleReview?.comment?.substring(0, 80)}...`);
  console.log(`- Images count: ${Array.isArray(sampleReview?.images) ? sampleReview?.images.length : 0}`);
  console.log(`- CSKH replies: ${sampleReview?.review_replies?.length}`);

  // Rollback to clean up test data
  const roll = await rollbackBatch(tag);
  console.log('Rollback:', roll.message);

  const restoredTour = await prisma.tours.findUnique({
    where: { tour_id: tour.tour_id },
    select: { rating_avg: true, rating_count: true }
  });
  console.log(`After rollback: ${restoredTour?.rating_avg} ⭐ (${restoredTour?.rating_count} reviews)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
