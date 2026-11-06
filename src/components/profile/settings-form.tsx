"use client";
import type { FormEvent } from "react";
import { Field, type FormProps, text } from "./fields";
export function SettingsForm({ bundle, save, pending }: FormProps) {
  const p = bundle.profile;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    await save({
      operation: "save-settings",
      settings: {
        weightUnit: text(d, "weightUnit") as "kg" | "lb",
        lengthUnit: text(d, "lengthUnit") as "cm" | "in",
        shareCompetitionSummary: d.has("sharing"),
        audioEnabled: d.has("audio"),
        hapticsEnabled: d.has("haptics"),
        motionPreference: text(d, "motion") as "system" | "reduce",
      },
    });
  }
  return (
    <section className="card">
      <h2>Privacy and preferences</h2>
      <form
        method="post"
        action="/api/profile"
        className="stack"
        onSubmit={submit}
        aria-busy={pending}
      >
        <Field id="weightUnit" title="Display weight in">
          <select
            id="weightUnit"
            name="weightUnit"
            defaultValue={p?.weightUnit}
          >
            {["kg", "lb"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field id="lengthUnit" title="Display lengths in">
          <select
            id="lengthUnit"
            name="lengthUnit"
            defaultValue={p?.lengthUnit}
          >
            {["cm", "in"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <label className="check">
          <input
            type="checkbox"
            name="sharing"
            defaultChecked={p?.shareCompetitionSummary}
          />
          Share competition summaries
        </label>
        <p className="muted">
          Allows scores and adherence when competition is available.
          Measurements, limitations, nutrition and notes remain private.
        </p>
        <label className="check">
          <input
            type="checkbox"
            name="audio"
            defaultChecked={p?.audioEnabled}
          />
          Allow workout sounds when available
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="haptics"
            defaultChecked={p?.hapticsEnabled}
          />
          Allow workout vibration when supported
        </label>
        <Field id="motion" title="Motion preference">
          <select id="motion" name="motion" defaultValue={p?.motionPreference}>
            <option value="system">Follow device setting</option>
            <option value="reduce">Reduce motion</option>
          </select>
        </Field>
        <p>
          No notification permission is requested here. Reminders and workout
          alerts will be added later.
        </p>
        <button type="submit" disabled={pending}>
          Save privacy and preferences
        </button>
      </form>
    </section>
  );
}
