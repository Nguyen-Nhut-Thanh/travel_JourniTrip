ALTER TABLE "membership_program" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "membership_program_versions" (
  "version" INTEGER PRIMARY KEY,
  "tiers" JSONB NOT NULL,
  "actor_account_id" INTEGER,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "membership_point_transactions" (
  "transaction_id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "booking_id" INTEGER REFERENCES "bookings"("booking_id") ON DELETE SET NULL,
  "voucher_id" INTEGER REFERENCES "vouchers"("voucher_id") ON DELETE SET NULL,
  "kind" VARCHAR(30) NOT NULL,
  "points" INTEGER NOT NULL,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "event_key" VARCHAR(150) NOT NULL UNIQUE,
  "description" VARCHAR(500) NOT NULL,
  "actor_account_id" INTEGER,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "membership_point_transactions_user_id_created_at_idx" ON "membership_point_transactions"("user_id", "created_at");
CREATE INDEX "membership_point_transactions_booking_id_idx" ON "membership_point_transactions"("booking_id");
INSERT INTO "membership_program_versions" ("version", "tiers") SELECT "version", "tiers" FROM "membership_program" WHERE "id" = 1;
