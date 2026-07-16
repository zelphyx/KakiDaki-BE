-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'HARD', 'EXTREME');

-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('DRAFT', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('GO', 'CAUTION', 'NO_GO');

-- CreateEnum
CREATE TYPE "LogisticCategory" AS ENUM ('CLOTHING', 'FOOD', 'WATER', 'NAVIGATION', 'SHELTER', 'MEDICAL', 'TOOLS', 'DOCUMENTS', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RUN', 'RIDE', 'HIKE', 'WALK', 'TRAIL_RUN', 'WORKOUT', 'OTHER');

-- CreateEnum
CREATE TYPE "FitnessSource" AS ENUM ('MANUAL', 'STRAVA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "age" INTEGER,
    "phone" TEXT,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "medical_history" TEXT,
    "has_completed_assessment" BOOLEAN NOT NULL DEFAULT false,
    "is_pro" BOOLEAN NOT NULL DEFAULT false,
    "prep_credits" INTEGER NOT NULL DEFAULT 1,
    "strava_athlete_id" TEXT,
    "strava_access_token" TEXT,
    "strava_refresh_token" TEXT,
    "strava_token_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitness_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" "FitnessSource" NOT NULL DEFAULT 'MANUAL',
    "weekly_distance_km" DOUBLE PRECISION,
    "weekly_elevation_m" DOUBLE PRECISION,
    "longest_hike_km" DOUBLE PRECISION,
    "avg_pace_min_per_km" DOUBLE PRECISION,
    "resting_heart_rate" INTEGER,
    "experience_level" TEXT,
    "capability_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitness_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mountains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "elevation_m" DOUBLE PRECISION NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "distance_to_peak_km" DOUBLE PRECISION NOT NULL,
    "base_temp_c" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mountains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expeditions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mountain_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "climb_temp_c" DOUBLE PRECISION,
    "weather_summary" TEXT,
    "readiness_score" DOUBLE PRECISION,
    "decision" "Decision",
    "ai_rationale" TEXT,
    "member_count" INTEGER NOT NULL DEFAULT 1,
    "status" "PrepStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expeditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics" (
    "id" TEXT NOT NULL,
    "expedition_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "category" "LogisticCategory" NOT NULL DEFAULT 'OTHER',
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "is_packed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "strava_activity_id" TEXT NOT NULL,
    "activity_type" "ActivityType" NOT NULL DEFAULT 'OTHER',
    "distance_km" DOUBLE PRECISION NOT NULL,
    "elevation_gain_m" DOUBLE PRECISION NOT NULL,
    "moving_time_sec" INTEGER NOT NULL,
    "avg_pace_min_per_km" DOUBLE PRECISION,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mountain_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "upvote" INTEGER NOT NULL DEFAULT 0,
    "downvote" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "gross_amount" DOUBLE PRECISION NOT NULL,
    "credits_bought" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "snap_token" TEXT,
    "snap_redirect_url" TEXT,
    "payment_type" TEXT,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fitness_profiles_user_id_key" ON "fitness_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mountains_name_key" ON "mountains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "training_logs_strava_activity_id_key" ON "training_logs"("strava_activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- AddForeignKey
ALTER TABLE "fitness_profiles" ADD CONSTRAINT "fitness_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_mountain_id_fkey" FOREIGN KEY ("mountain_id") REFERENCES "mountains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics" ADD CONSTRAINT "logistics_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_logs" ADD CONSTRAINT "training_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_mountain_id_fkey" FOREIGN KEY ("mountain_id") REFERENCES "mountains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
