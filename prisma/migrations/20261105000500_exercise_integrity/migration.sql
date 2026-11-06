-- PostgreSQL CHECK treats NULL as passing; require actual metadata collections.
ALTER TABLE exercise_versions
 ALTER COLUMN aliases SET NOT NULL,
 ALTER COLUMN metrics SET NOT NULL,
 ALTER COLUMN demands SET NOT NULL,
 ALTER COLUMN instructions SET NOT NULL,
 ALTER COLUMN "safetyNotes" SET NOT NULL,
 ALTER COLUMN "sourceUrls" SET NOT NULL;
ALTER TABLE exercise_versions ADD CONSTRAINT complete_exercise_metadata CHECK (
 char_length(btrim(name)) > 0 AND char_length(btrim(license)) > 0
 AND char_length(btrim("reviewedBy")) > 0
 AND laterality IN ('bilateral','unilateral')
 AND resistance IN ('bodyweight','dumbbell','kettlebell','treadmill','barbell','cable','machine','resistance_band')
 AND cardinality(metrics) > 0 AND metrics <@ ARRAY['repetitions','load_kg','duration_seconds','distance_meters']::text[]
 AND cardinality("sourceUrls") > 0
 AND "contentHash" ~ '^[a-f0-9]{64}$'
);
ALTER TABLE exercises ADD CONSTRAINT valid_exercise_identity CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(btrim("variantGroup")) > 0);
CREATE FUNCTION preserve_exercise_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.slug IS DISTINCT FROM OLD.slug OR NEW."variantGroup" IS DISTINCT FROM OLD."variantGroup" THEN
  RAISE EXCEPTION 'Exercise identity is immutable; create a distinct identity' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_exercise_identity BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION preserve_exercise_identity();
