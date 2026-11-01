"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
export default function Verify() {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    setToken(value);
    if (!value)
      setError(
        "This page needs a valid sign-in link. Request a new one below.",
      );
    window.history.replaceState(null, "", "/verify");
  }, []);
  async function confirm() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok)
        throw new Error(
          "This link is invalid, expired, or no longer eligible. Request a new link.",
        );
      window.location.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect.");
      setPending(false);
    }
  }
  return (
    <main id="main" className="auth">
      <h1>Confirm sign-in</h1>
      <p>
        Only continue if you requested this link. It expires after five minutes
        and works once.
      </p>
      <button type="button" onClick={confirm} disabled={!token || pending}>
        {pending ? "Signing in…" : "Confirm sign-in"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p>
        <Link href="/sign-in">Request another link</Link>
      </p>
    </main>
  );
}
