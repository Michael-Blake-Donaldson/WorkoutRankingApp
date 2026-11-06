-- Prisma scalar-list columns have no generated NOT NULL constraint. These
-- collections are required, including an explicit empty secondary-goal array.
ALTER TABLE fitness_profiles ALTER COLUMN "secondaryGoals" SET NOT NULL;
ALTER TABLE fitness_profiles ALTER COLUMN "trainingDays" SET NOT NULL;
ALTER TABLE body_measurements DROP CONSTRAINT valid_measurement;
ALTER TABLE body_measurements ADD CONSTRAINT valid_measurement CHECK (
  metric IN ('height','weight','waist','chest','hip','arm','thigh') AND "valueSi" > 0
  AND source = 'manual'
  AND ("correctsId" IS NULL OR ("correctsId" <> id AND "correctionReason" IS NOT NULL AND char_length(btrim("correctionReason")) > 0))
);
