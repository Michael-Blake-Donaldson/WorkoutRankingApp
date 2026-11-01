import { AuthForm } from "@/components/auth-form";
export default function Invite() {
  return (
    <main id="main" className="auth">
      <p className="eyebrow">Invitation only · Two accounts</p>
      <h1>Your own training space.</h1>
      <p>
        Confirm access to your invited email address to join. Invitations expire
        after 48 hours.
      </p>
      <section className="card" aria-label="Accept invitation">
        <AuthForm invite />
      </section>
    </main>
  );
}
