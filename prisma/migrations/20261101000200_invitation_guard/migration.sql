-- A locked singleton counter serializes all account creation, independently of the web layer.
ALTER TABLE account_capacity ADD CONSTRAINT capacity_singleton CHECK (id = 1);
ALTER TABLE account_capacity ADD CONSTRAINT capacity_range CHECK (occupied BETWEEN 0 AND 2);
INSERT INTO account_capacity (id, occupied) VALUES (1, 0);
ALTER TABLE users ADD CONSTRAINT user_slot_range CHECK (slot IN (1, 2));
ALTER TABLE users ADD CONSTRAINT normalized_email CHECK (email = lower(btrim(email)));

CREATE FUNCTION enforce_invitation_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allocated integer;
BEGIN
  UPDATE account_capacity SET occupied = occupied + 1
    WHERE id = 1 AND occupied < 2 RETURNING occupied INTO allocated;
  IF allocated IS NULL THEN RAISE EXCEPTION 'Account capacity reached' USING ERRCODE = '23514'; END IF;

  UPDATE invitations SET "usedAt" = clock_timestamp()
    WHERE email = NEW.email AND "usedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt" > clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'Valid invitation required' USING ERRCODE = '23514'; END IF;

  NEW.slot := allocated;
  INSERT INTO audit_events (id, "eventType", "entityId") VALUES (gen_random_uuid()::text, 'account.created', NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_user_creation BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION enforce_invitation_capacity();

-- Account email is identity in this phase. No unverified email-change endpoint is exposed.
CREATE FUNCTION prevent_identity_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.email <> OLD.email OR NEW.slot <> OLD.slot THEN
    RAISE EXCEPTION 'Identity changes require a reviewed migration' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_identity_update BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION prevent_identity_change();
