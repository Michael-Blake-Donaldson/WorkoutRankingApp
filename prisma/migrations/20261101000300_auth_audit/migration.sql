-- Runtime credentials cannot alter invitations/capacity directly. Only this
-- fixed trigger may consume an invitation while allocating an account slot.
ALTER FUNCTION enforce_invitation_capacity() SECURITY DEFINER;
ALTER FUNCTION enforce_invitation_capacity() SET search_path = pg_catalog, public, pg_temp;
REVOKE ALL ON FUNCTION enforce_invitation_capacity() FROM PUBLIC;

CREATE FUNCTION audit_session_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events (id, "eventType", "entityId")
      VALUES (gen_random_uuid()::text, 'session.created', NEW."userId");
    RETURN NEW;
  END IF;
  INSERT INTO public.audit_events (id, "eventType", "entityId")
    VALUES (gen_random_uuid()::text, 'session.revoked', OLD."userId");
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION audit_session_change() FROM PUBLIC;
CREATE TRIGGER audit_sessions AFTER INSERT OR DELETE ON sessions
FOR EACH ROW EXECUTE FUNCTION audit_session_change();
