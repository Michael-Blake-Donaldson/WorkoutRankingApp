"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";

export function AuthForm({ invite = false }: { invite?: boolean }) {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    setToken(fragment.get("token") ?? "");
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
    if (new URLSearchParams(window.location.search).has("error"))
      setError("Your link could not be used. Request a new one.");
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();
    try {
      const response = await fetch("/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          ...(invite ? { invitationToken: token } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Sign-in failed. Try again.");
      setMessage(body.message);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to connect. Try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack" aria-busy={pending}>
      <div>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </div>
      {invite && (
        <div>
          <label htmlFor="invitation">Invitation token</label>
          <input
            id="invitation"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
            maxLength={64}
            aria-describedby="invite-help"
          />
          <p id="invite-help" className="muted">
            Your private invitation fills this in. Use the email address it was
            issued for.
          </p>
        </div>
      )}
      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
