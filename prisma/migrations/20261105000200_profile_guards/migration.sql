ALTER TABLE fitness_profiles ADD CONSTRAINT valid_profile CHECK (
  version > 0 AND char_length("displayName") BETWEEN 1 AND 80
  AND experience IN ('beginner','intermediate','advanced')
  AND "primaryGoal" IN ('strength','muscle','endurance','general_fitness')
  AND cardinality("trainingDays") BETWEEN 1 AND 7
  AND "trainingDays" <@ ARRAY[0,1,2,3,4,5,6]::integer[]
  AND "durationMinutes" BETWEEN 10 AND 240
  AND "weightUnit" IN ('kg','lb') AND "lengthUnit" IN ('cm','in')
  AND "motionPreference" IN ('system','reduce')
  AND ("calorieTarget" IS NULL OR "calorieTarget" > 0 AND "calorieTarget" <= 20000)
  AND ("proteinTargetG" IS NULL OR "proteinTargetG" > 0 AND "proteinTargetG" <= 1000)
);
ALTER TABLE body_measurements ADD CONSTRAINT valid_measurement CHECK (
  metric IN ('height','weight','waist','chest','hip','arm','thigh') AND "valueSi" > 0
  AND source = 'manual'
  AND ("correctsId" IS NULL OR "correctsId" <> id AND char_length(btrim("correctionReason")) > 0)
);
ALTER TABLE equipment_profiles ADD CONSTRAINT valid_location CHECK (
  location IN ('home','gym','travel') AND char_length(btrim(name)) BETWEEN 1 AND 80
  AND ("archivedAt" IS NULL OR "isDefault" = false)
);
CREATE UNIQUE INDEX one_default_equipment_per_user ON equipment_profiles ("userId") WHERE "isDefault" AND "archivedAt" IS NULL;
ALTER TABLE equipment_items ADD CONSTRAINT valid_equipment_loads CHECK (
  "equipmentType" IN ('dumbbell','barbell','bench','rack','pull_up_bar','resistance_band','kettlebell','cable','machine','treadmill','bike')
  AND ("minLoadKg" IS NULL OR "minLoadKg" > 0 AND "minLoadKg" <= 2000)
  AND ("maxLoadKg" IS NULL OR "maxLoadKg" > 0 AND "maxLoadKg" <= 2000)
  AND ("incrementKg" IS NULL OR "incrementKg" > 0 AND "incrementKg" <= 2000)
  AND ("minLoadKg" IS NULL OR "maxLoadKg" IS NULL OR "minLoadKg" <= "maxLoadKg")
);

-- Every new private table is protected in addition to application ownership checks.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['fitness_profiles','body_measurements','equipment_profiles','equipment_items','profile_revisions','profile_mutations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY owner_only ON public.%I USING ("userId" = current_setting(''app.user_id'', true)) WITH CHECK ("userId" = current_setting(''app.user_id'', true))', table_name);
  END LOOP;
END;
$$;

CREATE FUNCTION preserve_profile_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'History is immutable; append a correction or revision' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER immutable_measurement BEFORE UPDATE ON body_measurements FOR EACH ROW EXECUTE FUNCTION preserve_profile_history();
CREATE TRIGGER immutable_profile_revision BEFORE UPDATE ON profile_revisions FOR EACH ROW EXECUTE FUNCTION preserve_profile_history();
CREATE TRIGGER immutable_profile_mutation BEFORE UPDATE ON profile_mutations FOR EACH ROW EXECUTE FUNCTION preserve_profile_history();

CREATE FUNCTION audit_profile_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  INSERT INTO public.audit_events (id, "eventType", "entityId") VALUES (gen_random_uuid()::text, 'profile.revised', NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION audit_profile_revision() FROM PUBLIC;
CREATE TRIGGER audit_profile_revisions AFTER INSERT ON profile_revisions FOR EACH ROW EXECUTE FUNCTION audit_profile_revision();
