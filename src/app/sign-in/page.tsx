import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export default function SignIn() {
  return (
    <main id="main" className="auth">
      <p className="eyebrow">Welcome back</p>
      <h1>Sign in privately.</h1>
      <p className="muted">
        Use your email to receive a secure, one-time sign-in link. This
        workspace is invitation-only.
      </p>
      <section className="card" aria-label="Email sign-in">
        <AuthForm />
      </section>
      <p>
        First time here? <Link href="/invite">Use your invitation</Link>.
      </p>
    </main>
  );
}
