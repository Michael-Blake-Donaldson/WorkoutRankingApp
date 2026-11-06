import { ProfileWorkspace } from "@/components/profile-workspace";
import { requireSession } from "@/modules/auth/session";
import { getProfileBundle } from "@/modules/profile/service";
export default async function ProgressPage() {
  const session = await requireSession();
  return (
    <main id="main">
      <h1>Progress</h1>
      <ProfileWorkspace
        initial={await getProfileBundle(session.user.id)}
        mode="progress"
      />
    </main>
  );
}
