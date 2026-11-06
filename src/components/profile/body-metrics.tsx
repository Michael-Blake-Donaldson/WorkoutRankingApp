"use client";
import type { ProfileBundle } from "@/modules/profile/contracts";
import { bmiHistory } from "@/modules/profile/units";
export function BodyMetrics({ bundle }: { bundle: ProfileBundle }) {
  const history = bmiHistory([
    ...bundle.measurements,
    ...(bundle.baselineHeight &&
    !bundle.measurements.some((m) => m.id === bundle.baselineHeight?.id)
      ? [bundle.baselineHeight]
      : []),
  ]);
  return (
    <section className="card">
      <h2>BMI history</h2>
      <p>
        BMI is weight in kg divided by height in metres squared. It is
        contextual information, not a health score or a measure of body
        composition, and never affects ranking.
      </p>
      {!history.length ? (
        <p>Record height and weight to see BMI history.</p>
      ) : (
        <ul>
          {history
            .slice()
            .reverse()
            .map((point) => (
              <li key={point.id}>
                {point.recordedAt.slice(0, 10)}:{" "}
                {point.value ??
                  "No height recorded at or before this weight entry"}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
