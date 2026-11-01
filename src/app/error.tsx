"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main">
      <h1>We couldn’t load this page.</h1>
      <p role="alert">
        The service may be temporarily unavailable. Please try again.
      </p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
