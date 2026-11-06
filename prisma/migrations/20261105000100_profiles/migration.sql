-- CreateTable
CREATE TABLE "fitness_profiles" (
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "displayName" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "primaryGoal" TEXT NOT NULL,
    "secondaryGoals" TEXT[],
    "trainingDays" INTEGER[],
    "durationMinutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "likes" TEXT NOT NULL DEFAULT '',
    "dislikes" TEXT NOT NULL DEFAULT '',
    "limitations" TEXT NOT NULL DEFAULT '',
    "heightCm" DECIMAL(10,3),
    "calorieTarget" DECIMAL(10,2),
    "proteinTargetG" DECIMAL(10,2),
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "lengthUnit" TEXT NOT NULL DEFAULT 'cm',
    "shareCompetitionSummary" BOOLEAN NOT NULL DEFAULT false,
    "audioEnabled" BOOLEAN NOT NULL DEFAULT false,
    "hapticsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "motionPreference" TEXT NOT NULL DEFAULT 'system',
    "onboardingCompletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fitness_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "valueSi" DECIMAL(12,6) NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "correctsId" TEXT,
    "correctionReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_items" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "minLoadKg" DECIMAL(10,3),
    "maxLoadKg" DECIMAL(10,3),
    "incrementKg" DECIMAL(10,3),

    CONSTRAINT "equipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_revisions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_mutations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "appliedVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_mutations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "body_measurements_correctsId_key" ON "body_measurements"("correctsId");

-- CreateIndex
CREATE INDEX "body_measurements_userId_recordedAt_idx" ON "body_measurements"("userId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "body_measurements_id_userId_metric_key" ON "body_measurements"("id", "userId", "metric");

-- CreateIndex
CREATE INDEX "equipment_profiles_userId_createdAt_idx" ON "equipment_profiles"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_profiles_id_userId_key" ON "equipment_profiles"("id", "userId");

-- CreateIndex
CREATE INDEX "equipment_items_userId_profileId_idx" ON "equipment_items"("userId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_items_profileId_equipmentType_key" ON "equipment_items"("profileId", "equipmentType");

-- CreateIndex
CREATE UNIQUE INDEX "profile_revisions_userId_version_key" ON "profile_revisions"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "profile_mutations_userId_clientMutationId_key" ON "profile_mutations"("userId", "clientMutationId");

-- AddForeignKey
ALTER TABLE "fitness_profiles" ADD CONSTRAINT "fitness_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_correctsId_userId_metric_fkey" FOREIGN KEY ("correctsId", "userId", "metric") REFERENCES "body_measurements"("id", "userId", "metric") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipment_profiles" ADD CONSTRAINT "equipment_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_profileId_userId_fkey" FOREIGN KEY ("profileId", "userId") REFERENCES "equipment_profiles"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_revisions" ADD CONSTRAINT "profile_revisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_mutations" ADD CONSTRAINT "profile_mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
