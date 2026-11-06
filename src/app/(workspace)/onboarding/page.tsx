import { ProfileWorkspace } from "@/components/profile-workspace";
import { requireSession } from "@/modules/auth/session";
import { getProfileBundle } from "@/modules/profile/service";
export default async function OnboardingPage() {
  const session = await requireSession();
  return (
    <main id="main">
      <h1>Set up your training profile</h1>
      <p>
        Choose your goals, environment and measurements. No program changes are
        made automatically.
      </p>
      <ProfileWorkspace
        initial={await getProfileBundle(session.user.id)}
        mode="onboarding"
      />
    </main>
  );
}
