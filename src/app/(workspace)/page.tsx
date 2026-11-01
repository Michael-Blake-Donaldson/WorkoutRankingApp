import { requireSession } from "@/modules/auth/session";

export default async function Home() {
  await requireSession();
  return (
    <main id="main">
      <p className="eyebrow">Your workspace</p>
      <h1>A foundation for your training.</h1>
      <p className="muted">
        Your private account is ready. Training tools will be added in the next
        development phases.
      </p>
      <section className="card">
        <h2>What is available now</h2>
        <p>
          Secure sign-in, private navigation, and installation on supported
          devices.
        </p>
      </section>
      <section className="card">
        <h2>What comes next</h2>
        <p>
          Personal setup, guided training with changes you approve, RPG
          progression, head-to-head competition, and basic nutrition.
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
