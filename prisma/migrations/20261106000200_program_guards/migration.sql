CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
ALTER TABLE program_states ADD CONSTRAINT valid_program_revision CHECK (revision >= 0);
ALTER TABLE fatigue_check_ins ADD CONSTRAINT valid_check_in CHECK ((fatigue IS NULL OR fatigue BETWEEN 1 AND 5) AND (soreness IS NULL OR soreness BETWEEN 1 AND 5) AND char_length(notes) <= 1000);
ALTER TABLE program_rule_versions ADD CONSTRAINT valid_program_rules CHECK ("contentHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("configJson")='object');
ALTER TABLE program_versions ADD CONSTRAINT valid_program_version CHECK (version > 0 AND "profileVersion" > 0 AND "baseRevision" > 0 AND kind IN ('training','pause') AND jsonb_typeof("planJson")='object');
ALTER TABLE program_decisions ADD CONSTRAINT valid_program_decision CHECK (decision IN ('accepted','rejected'));
ALTER TABLE program_sessions ADD CONSTRAINT valid_program_session CHECK ("endsAt" > "scheduledAt" AND "estimatedMinutes" BETWEEN 1 AND 240 AND kind IN ('full','upper','lower','conditioning') AND "localDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND "localStart" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE prescribed_exercises ADD CONSTRAINT valid_prescription CHECK (ordinal >= 0 AND jsonb_typeof("targetJson")='object' AND jsonb_typeof("snapshotJson")='object');
ALTER TABLE program_slots ADD CONSTRAINT valid_program_slot CHECK ("endsAt" > "startsAt");
ALTER TABLE program_slots ADD CONSTRAINT no_overlapping_program_slots EXCLUDE USING gist ("userId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&);
ALTER TABLE schedule_events ADD CONSTRAINT valid_schedule_event CHECK (reason IN ('superseded','paused'));
ALTER TABLE program_mutations ADD CONSTRAINT valid_program_receipt CHECK ("appliedRevision" > 0 AND "payloadHash" ~ '^[a-f0-9]{64}$');
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['program_states','fatigue_check_ins','program_versions','program_decisions','program_sessions','prescribed_exercises','program_slots','schedule_events','program_mutations'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format('CREATE POLICY owner_only ON public.%I USING ("userId" = current_setting(''app.user_id'', true)) WITH CHECK ("userId" = current_setting(''app.user_id'', true))', table_name);
 END LOOP;
 FOREACH table_name IN ARRAY ARRAY['fatigue_check_ins','program_versions','program_decisions','program_sessions','prescribed_exercises','schedule_events','program_mutations'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION preserve_profile_history()',table_name);
 END LOOP;
END;
$$;
CREATE TRIGGER immutable_program_rules BEFORE UPDATE OR DELETE ON program_rule_versions FOR EACH ROW EXECUTE FUNCTION preserve_profile_history();
CREATE FUNCTION verify_program_slot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM program_sessions s WHERE s.id=NEW."sessionId" AND s."userId"=NEW."userId" AND s."scheduledAt"=NEW."startsAt" AND s."endsAt"=NEW."endsAt") THEN
  RAISE EXCEPTION 'Calendar projection must match its owned prescription' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER matching_program_slot BEFORE INSERT OR UPDATE ON program_slots FOR EACH ROW EXECUTE FUNCTION verify_program_slot();
CREATE FUNCTION verify_approved_program() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM program_decisions d JOIN program_versions v ON v.id=d."programVersionId" AND v."userId"=d."userId" WHERE d."programVersionId"=NEW."programVersionId" AND d."userId"=NEW."userId" AND d.decision='accepted' AND v.kind='training') THEN
  RAISE EXCEPTION 'Sessions require an accepted owned training proposal' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER approved_program_session BEFORE INSERT ON program_sessions FOR EACH ROW EXECUTE FUNCTION verify_approved_program();
CREATE FUNCTION audit_program_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 INSERT INTO public.audit_events (id,"eventType","entityId") VALUES (gen_random_uuid()::text, TG_ARGV[0], NEW.id);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION audit_program_event() FROM PUBLIC;
CREATE TRIGGER audit_program_decision AFTER INSERT ON program_decisions FOR EACH ROW EXECUTE FUNCTION audit_program_event('program.decided');
CREATE TRIGGER audit_fatigue_check_in AFTER INSERT ON fatigue_check_ins FOR EACH ROW EXECUTE FUNCTION audit_program_event('program.checked_in');
