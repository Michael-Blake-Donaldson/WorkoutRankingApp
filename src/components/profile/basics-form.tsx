"use client";
import type { FormEvent } from "react";
import type { Basics } from "@/modules/profile/contracts";
import { goals } from "@/modules/profile/options";
import { days, Field, type FormProps, label, text } from "./fields";
export function BasicsForm({ bundle, save, pending }: FormProps) {
  const p = bundle.profile;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const basics: Basics = {
      displayName: text(data, "displayName"),
      experience: text(data, "experience") as Basics["experience"],
      primaryGoal: text(data, "primaryGoal") as Basics["primaryGoal"],
      secondaryGoals: data
        .getAll("secondaryGoals")
        .map(String) as Basics["secondaryGoals"],
      trainingDays: data.getAll("days").map(Number),
      durationMinutes: Number(data.get("durationMinutes")),
      timezone: text(data, "timezone"),
      likes: text(data, "likes"),
      dislikes: text(data, "dislikes"),
      limitations: text(data, "limitations"),
      calorieTarget: text(data, "calorieTarget") || null,
      proteinTargetG: text(data, "proteinTargetG") || null,
    };
    await save({ operation: "save-profile", basics });
  }
  return (
    <section className="card">
      <h2>Training preferences</h2>
      <form
        method="post"
        action="/api/profile"
        onSubmit={submit}
        className="stack"
        aria-busy={pending}
      >
        <Field id="displayName" title="Display name">
          <input
            id="displayName"
            name="displayName"
            required
            maxLength={80}
            defaultValue={p?.displayName ?? ""}
          />
        </Field>
        <Field id="experience" title="Training experience">
          <select
            id="experience"
            name="experience"
            defaultValue={p?.experience ?? "beginner"}
          >
            {["beginner", "intermediate", "advanced"].map((v) => (
              <option key={v} value={v}>
                {label(v)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="primaryGoal" title="Primary goal">
          <select
            id="primaryGoal"
            name="primaryGoal"
            defaultValue={p?.primaryGoal ?? "general_fitness"}
          >
            {goals.map((v) => (
              <option key={v} value={v}>
                {label(v)}
              </option>
            ))}
          </select>
        </Field>
        <fieldset>
          <legend>
            Secondary goals (optional, different from your primary goal)
          </legend>
          {goals.map((v) => (
            <label className="check" key={v}>
              <input
                type="checkbox"
                name="secondaryGoals"
                value={v}
                defaultChecked={p?.secondaryGoals.includes(v) ?? false}
              />
              {label(v)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Training days (choose at least one)</legend>
          {days.map((v, i) => (
            <label className="check" key={v}>
              <input
                type="checkbox"
                name="days"
                value={i}
                defaultChecked={p?.trainingDays.includes(i) ?? false}
              />
              {v}
            </label>
          ))}
        </fieldset>
        <Field id="durationMinutes" title="Minutes available per session">
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={10}
            max={240}
            required
            defaultValue={p?.durationMinutes ?? 45}
          />
        </Field>
        <Field id="timezone" title="Timezone (IANA name)">
          <input
            id="timezone"
            name="timezone"
            required
            maxLength={100}
            defaultValue={p?.timezone ?? "America/New_York"}
            list="timezones"
          />
          <datalist id="timezones">
            {[
              "America/New_York",
              "America/Chicago",
              "America/Denver",
              "America/Los_Angeles",
              "Europe/London",
              "UTC",
            ].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field id="likes" title="Exercises or activities you like (optional)">
          <textarea
            id="likes"
            name="likes"
            maxLength={1000}
            defaultValue={p?.likes ?? ""}
          />
        </Field>
        <Field
          id="dislikes"
          title="Exercises or activities you dislike (optional)"
        >
          <textarea
            id="dislikes"
            name="dislikes"
            maxLength={1000}
            defaultValue={p?.dislikes ?? ""}
          />
        </Field>
        <Field
          id="limitations"
          title="Limitations or restrictions (optional, private)"
        >
          <textarea
            id="limitations"
            name="limitations"
            maxLength={2000}
            defaultValue={p?.limitations ?? ""}
          />
        </Field>
        <Field id="calorieTarget" title="Daily calorie target (optional)">
          <input
            id="calorieTarget"
            name="calorieTarget"
            type="number"
            step="0.01"
            min="0.01"
            max="20000"
            defaultValue={p?.calorieTarget ?? ""}
          />
        </Field>
        <Field
          id="proteinTargetG"
          title="Daily protein target in grams (optional)"
        >
          <input
            id="proteinTargetG"
            name="proteinTargetG"
            type="number"
            step="0.01"
            min="0.01"
            max="1000"
            defaultValue={p?.proteinTargetG ?? ""}
          />
        </Field>
        <p className="muted">
          Nutrition targets are entered by you and are optional. This app does
          not prescribe targets or use them for competition.
        </p>
        <button type="submit" disabled={pending}>
          {pending ? "Please wait…" : "Save training preferences"}
        </button>
      </form>
    </section>
  );
}
