-- AlterTable
ALTER TABLE "fitness_profiles" ADD COLUMN     "movementFiltersReviewed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "muscles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "muscles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "variantGroup" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_versions" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "modality" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "laterality" TEXT NOT NULL,
    "resistance" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "metrics" TEXT[],
    "demands" TEXT[],
    "instructions" TEXT[],
    "safetyNotes" TEXT[],
    "sourceUrls" TEXT[],
    "license" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMPTZ(3) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL,

    CONSTRAINT "exercise_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscles" (
    "exerciseVersionId" TEXT NOT NULL,
    "muscleId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "exercise_muscles_pkey" PRIMARY KEY ("exerciseVersionId","muscleId")
);

-- CreateTable
CREATE TABLE "exercise_equipment" (
    "exerciseVersionId" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,

    CONSTRAINT "exercise_equipment_pkey" PRIMARY KEY ("exerciseVersionId","equipmentType")
);

-- CreateTable
CREATE TABLE "user_exercise_restrictions" (
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "user_exercise_restrictions_pkey" PRIMARY KEY ("userId","code")
);

-- CreateTable
CREATE TABLE "user_exercise_choices" (
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "preference" TEXT NOT NULL,

    CONSTRAINT "user_exercise_choices_pkey" PRIMARY KEY ("userId","exerciseId")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises"("slug");

-- CreateIndex
CREATE INDEX "exercise_versions_reviewStatus_name_idx" ON "exercise_versions"("reviewStatus", "name");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_versions_exerciseId_version_key" ON "exercise_versions"("exerciseId", "version");

-- AddForeignKey
ALTER TABLE "exercise_versions" ADD CONSTRAINT "exercise_versions_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exerciseVersionId_fkey" FOREIGN KEY ("exerciseVersionId") REFERENCES "exercise_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscleId_fkey" FOREIGN KEY ("muscleId") REFERENCES "muscles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exerciseVersionId_fkey" FOREIGN KEY ("exerciseVersionId") REFERENCES "exercise_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_restrictions" ADD CONSTRAINT "user_exercise_restrictions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_choices" ADD CONSTRAINT "user_exercise_choices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_choices" ADD CONSTRAINT "user_exercise_choices_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Catalogue versions are append-only, even for operators; publish a new version.
CREATE TRIGGER immutable_exercise_version BEFORE UPDATE OR DELETE ON exercise_versions FOR EACH ROW EXECUTE FUNCTION preserve_profile_history();
CREATE TRIGGER immutable_exercise_muscle BEFORE UPDATE OR DELETE ON exercise_muscles FOR EACH ROW EXECUTE FUNCTION preserve_profile_history();
CREATE TRIGGER immutable_exercise_equipment BEFORE UPDATE OR DELETE ON exercise_equipment FOR EACH ROW EXECUTE FUNCTION preserve_profile_history();
ALTER TABLE exercise_versions ADD CONSTRAINT valid_exercise_version CHECK (
 version > 0 AND difficulty BETWEEN 1 AND 3 AND "reviewStatus" IN ('editorial','unreviewed')
 AND cardinality(instructions) > 0 AND cardinality("safetyNotes") > 0
 AND modality IN ('resistance','bodyweight','isometric','running','walking')
 AND pattern IN ('squat','lunge','hinge','hip_extension','horizontal_push','horizontal_pull','vertical_push','vertical_pull','trunk_brace','locomotion')
 AND demands <@ ARRAY['impact','overhead','kneeling','wrist_extension','external_spinal_load','deep_knee_bend','floor_transfer','unsupported_balance']::text[]
);
ALTER TABLE exercise_muscles ADD CONSTRAINT valid_muscle_role CHECK (role IN ('primary','secondary'));
ALTER TABLE exercise_equipment ADD CONSTRAINT valid_exercise_equipment CHECK ("equipmentType" IN ('dumbbell','barbell','bench','rack','pull_up_bar','resistance_band','kettlebell','cable','machine','treadmill','bike'));
ALTER TABLE user_exercise_restrictions ADD CONSTRAINT valid_restriction CHECK (code IN ('impact','overhead','kneeling','wrist_extension','external_spinal_load','deep_knee_bend','floor_transfer','unsupported_balance'));
ALTER TABLE user_exercise_choices ADD CONSTRAINT valid_exercise_choice CHECK (preference IN ('like','dislike','exclude'));
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['user_exercise_restrictions','user_exercise_choices'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format('CREATE POLICY owner_only ON public.%I USING ("userId" = current_setting(''app.user_id'', true)) WITH CHECK ("userId" = current_setting(''app.user_id'', true))', table_name);
 END LOOP;
END;
$$;
