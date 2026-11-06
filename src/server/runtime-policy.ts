import { db } from "./db";

let verified: Promise<void> | undefined;
export async function enforceRuntimePolicy() {
  if (process.env.NODE_ENV !== "production") return;
  if (!verified) {
    verified = (async () => {
      const [role] = await db.$queryRaw<{ elevated: boolean }[]>`
        SELECT (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls
          OR has_schema_privilege(current_user, 'public', 'CREATE')
          OR has_table_privilege(current_user, 'invitations', 'INSERT')
          OR has_table_privilege(current_user, 'account_capacity', 'UPDATE')
          OR has_table_privilege(current_user, 'audit_events', 'DELETE')) AS elevated
        FROM pg_roles WHERE rolname = current_user`;
      if (!role || role.elevated)
        throw new Error("Restricted runtime database role required");
    })().catch((error) => {
      verified = undefined;
      throw error;
    });
  }
  await verified;
}
