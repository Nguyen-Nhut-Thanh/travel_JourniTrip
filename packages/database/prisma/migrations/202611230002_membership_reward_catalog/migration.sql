CREATE TABLE "membership_reward_catalog" (
  "reward_id" VARCHAR(100) PRIMARY KEY,
  "config" JSONB NOT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
