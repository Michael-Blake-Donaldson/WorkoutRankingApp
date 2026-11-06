import Link from "next/link";
import { requireSession } from "@/modules/auth/session";
import { getProfileBundle } from "@/modules/profile/service";

export default async function Home() {
  const session = await requireSession();
  const { profile } = await getProfileBundle(session.user.id);
  return (
    <main id="main">
      <p className="eyebrow">Your workspace</p>
      <h1>A foundation for your training.</h1>
      <section className="card">
        <h2>
          {profile?.onboardingCompletedAt
            ? `Welcome, ${profile.displayName}`
            : "Make this your training space"}
        </h2>
        <p>
          {profile?.onboardingCompletedAt
            ? "Your profile is ready. You can review and edit your preferences at any time."
            : "Set your goals, training days, equipment and measurements to prepare for guided training."}
        </p>
        <Link
          className="button"
          href={profile?.onboardingCompletedAt ? "/profile" : "/onboarding"}
        >
          {profile?.onboardingCompletedAt
            ? "Review profile"
            : "Start or resume setup"}
        </Link>
      </section>
      <p className="muted">
        Your private account is ready. Training tools will be added in the next
        development phases.
      </p>
      <section className="card">
        <h2>What is available now</h2>
        <p>
          Private profiles, equipment locations, measurement history, secure
          sign-in and installation on supported devices.
        </p>
      </section>
      <section className="card">
        <h2>What comes next</h2>
        <p>
          Guided training with changes you approve, RPG progression,
          head-to-head competition, and basic nutrition.
        </p>
        <p>No workouts, scores, or nutrition entries have been generated.</p>
      </section>
      <section className="card">
        <h2>Install on your phone</h2>
        <p>
          On iPhone, open this site in Safari, tap Share, then Add to Home
          Screen. Other supported browsers offer an Install option in their
          menu.
        </p>
        <p className="muted">
          Sign-in needs a connection. Offline workout logging is planned for
          Phase 5.
        </p>
      </section>
    </main>
  );
}
