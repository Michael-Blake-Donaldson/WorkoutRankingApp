-- CreateTable
CREATE TABLE "program_rule_versions" (
    "id" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_states" (
    "userId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "program_states_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "fatigue_check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fatigue" INTEGER,
    "soreness" INTEGER,
    "pain" BOOLEAN,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fatigue_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_versions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "profileVersion" INTEGER NOT NULL,
    "baseRevision" INTEGER NOT NULL,
    "rulesVersionId" TEXT NOT NULL,
    "planJson" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_decisions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "localStart" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescribed_exercises" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseVersionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "targetJson" JSONB NOT NULL,
    "snapshotJson" JSONB NOT NULL,

    CONSTRAINT "prescribed_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_slots" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "program_slots_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "schedule_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_mutations" (
    "userId" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "appliedRevision" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_mutations_pkey" PRIMARY KEY ("userId","clientMutationId")
);

-- CreateIndex
CREATE INDEX "fatigue_check_ins_userId_createdAt_idx" ON "fatigue_check_ins"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "program_versions_userId_createdAt_idx" ON "program_versions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "program_versions_id_userId_key" ON "program_versions"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "program_versions_userId_version_key" ON "program_versions"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "program_decisions_programVersionId_key" ON "program_decisions"("programVersionId");

-- CreateIndex
CREATE INDEX "program_decisions_userId_createdAt_idx" ON "program_decisions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "program_decisions_id_userId_key" ON "program_decisions"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "program_decisions_programVersionId_userId_key" ON "program_decisions"("programVersionId", "userId");

-- CreateIndex
CREATE INDEX "program_sessions_userId_scheduledAt_idx" ON "program_sessions"("userId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "program_sessions_id_userId_key" ON "program_sessions"("id", "userId");

-- CreateIndex
CREATE INDEX "prescribed_exercises_userId_sessionId_idx" ON "prescribed_exercises"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "prescribed_exercises_sessionId_ordinal_key" ON "prescribed_exercises"("sessionId", "ordinal");

-- CreateIndex
CREATE INDEX "program_slots_userId_startsAt_idx" ON "program_slots"("userId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "program_slots_sessionId_userId_key" ON "program_slots"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_events_sessionId_key" ON "schedule_events"("sessionId");

-- CreateIndex
CREATE INDEX "schedule_events_userId_createdAt_idx" ON "schedule_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_events_sessionId_userId_key" ON "schedule_events"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "program_states" ADD CONSTRAINT "program_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatigue_check_ins" ADD CONSTRAINT "fatigue_check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_versions" ADD CONSTRAINT "program_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_versions" ADD CONSTRAINT "program_versions_rulesVersionId_fkey" FOREIGN KEY ("rulesVersionId") REFERENCES "program_rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_decisions" ADD CONSTRAINT "program_decisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_decisions" ADD CONSTRAINT "program_decisions_programVersionId_userId_fkey" FOREIGN KEY ("programVersionId", "userId") REFERENCES "program_versions"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_programVersionId_userId_fkey" FOREIGN KEY ("programVersionId", "userId") REFERENCES "program_versions"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescribed_exercises" ADD CONSTRAINT "prescribed_exercises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescribed_exercises" ADD CONSTRAINT "prescribed_exercises_sessionId_userId_fkey" FOREIGN KEY ("sessionId", "userId") REFERENCES "program_sessions"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescribed_exercises" ADD CONSTRAINT "prescribed_exercises_exerciseVersionId_fkey" FOREIGN KEY ("exerciseVersionId") REFERENCES "exercise_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_slots" ADD CONSTRAINT "program_slots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_slots" ADD CONSTRAINT "program_slots_sessionId_userId_fkey" FOREIGN KEY ("sessionId", "userId") REFERENCES "program_sessions"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_sessionId_userId_fkey" FOREIGN KEY ("sessionId", "userId") REFERENCES "program_sessions"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_decisionId_userId_fkey" FOREIGN KEY ("decisionId", "userId") REFERENCES "program_decisions"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_mutations" ADD CONSTRAINT "program_mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
