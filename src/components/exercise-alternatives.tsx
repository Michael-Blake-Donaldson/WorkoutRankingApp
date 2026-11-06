"use client";
import Link from "next/link";
import { type FormEvent, useState, useSyncExternalStore } from "react";
import type { AlternativesResult } from "@/modules/exercises/types";

type ComparisonConfig = {
  accountId: string;
  profile: { version: number } | null;
  equipment: { id: string; name: string; isDefault: boolean }[];
};

const subscribe = () => () => {};
export function ExerciseAlternatives({
  bundle,
  exerciseId,
}: {
  bundle: ComparisonConfig;
  exerciseId: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AlternativesResult | null>(null);
  const [environment, setEnvironment] = useState(
    bundle.equipment.find((e) => e.isDefault)?.id ??
      bundle.equipment[0]?.id ??
      "",
  );
  async function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !bundle.profile) return;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/exercises/alternatives", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-profile-owner": bundle.accountId,
        },
        body: JSON.stringify({
          exerciseId,
          equipmentProfileId: environment,
          expectedProfileVersion: bundle.profile.version,
        }),
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error("Service unavailable. Retry when connected.");
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Comparison unavailable.");
      setResult(body);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to compare. Retry when connected.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="card">
      <h2>Compare alternatives</h2>
      <p>
        Results use your saved movement filters and selected equipment location.
        No movement is automatically applied to a workout.
      </p>
      <p>
        <Link href="/profile#movement-filters">
          Review private movement filters
        </Link>{" "}
        · <Link href="/profile">Edit equipment locations</Link>
      </p>
      {!bundle.profile || !bundle.equipment.length ? (
        <p>
          Save profile basics and an equipment location before comparing
          alternatives.
        </p>
      ) : (
        <form
          method="post"
          action="/api/exercises/alternatives"
          className="stack"
          onSubmit={compare}
          aria-busy={pending}
        >
          <label htmlFor="comparison-environment">Equipment location</label>
          <select
            disabled={pending}
            id="comparison-environment"
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              setResult(null);
              setError("");
            }}
          >
            {bundle.equipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!hydrated || pending}>
            {pending ? "Comparing…" : "Compare alternatives"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            className="secondary"
            onClick={() => window.location.reload()}
          >
            Reload saved configuration
          </button>
        </p>
      )}
      {result && (
        <div aria-live="polite">
          <p role="status">{result.message}</p>
          <p>
            Rules: {result.rulesVersion} · Profile revision{" "}
            {result.profileVersion}
          </p>
          {!result.sourceGate.eligible && (
            <>
              <h3>Original movement does not meet these filters</h3>
              <ul>
                {result.sourceGate.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
          <ul className="exercise-list">
            {result.alternatives.map((a) => (
              <li key={a.exercise.id}>
                <h3>
                  <Link href={`/train/exercises/${a.exercise.slug}`}>
                    {a.exercise.name}
                  </Link>
                </h3>
                <p>
                  {a.relationship === "same_pattern"
                    ? "Same movement pattern"
                    : "Related movement — pattern changes"}{" "}
                  · Ranking score {a.score.toFixed(3)} (not a safety rating)
                </p>
                <details>
                  <summary>Score components and differences</summary>
                  <p>
                    Muscle {a.components.muscle.toFixed(3)} · Pattern{" "}
                    {a.components.pattern.toFixed(3)} · Equipment{" "}
                    {a.components.equipment.toFixed(3)} · Difficulty{" "}
                    {a.components.difficulty.toFixed(3)} · Preference{" "}
                    {a.components.preference.toFixed(3)}
                  </p>
                  <ul>
                    {a.differences.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
          <p>
            {result.excludedCount} other library entries were removed by
            eligibility checks. Scores do not establish suitability, equal load
            or equal stimulus.
          </p>
        </div>
      )}
    </section>
  );
}
