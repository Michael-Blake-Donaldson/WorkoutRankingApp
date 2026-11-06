import { ProfileWorkspace } from "@/components/profile-workspace";
import { SignOut } from "@/components/sign-out";
import { requireSession } from "@/modules/auth/session";
import { getProfileBundle } from "@/modules/profile/service";
export default async function ProfilePage() {
  const session = await requireSession();
  const initial = await getProfileBundle(session.user.id);
  return (
    <main id="main">
      <h1>Profile</h1>
      <p>Your training preferences and health data are private by default.</p>
      <ProfileWorkspace initial={initial} mode="profile" />
      <section className="card">
        <h2>Account</h2>
        <p>Signed in as {session.user.email}</p>
        <SignOut />
      </section>
    </main>
  );
}
