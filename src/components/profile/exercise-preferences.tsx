"use client";
import type { FormEvent } from "react";
import {
  type ExercisePreference,
  preferenceOptions,
  type Restriction,
  restrictionOptions,
} from "@/modules/exercises/options";
import { type FormProps, label } from "./fields";
export function ExercisePreferences({
  bundle,
  save,
  pending,
  library,
}: FormProps & { library: { id: string; name: string }[] }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await save({
      operation: "save-exercise-preferences",
      reviewed: data.has("filtersReviewed"),
      restrictions: data.getAll("restriction") as Restriction[],
      choices: library.map((e) => ({
        exerciseId: e.id,
        preference: String(
          data.get(`choice-${e.id}`) ?? "neutral",
        ) as ExercisePreference,
      })),
    });
  }
  return (
    <section className="card" id="movement-filters">
      <h2>Movement filters and exercise preferences</h2>
      <p>
        Choose movement demands you need to avoid. These filters do not assess
        injuries or establish medical suitability. Private free-text likes and
        dislikes are not interpreted here.
      </p>
      {bundle.profile?.limitations.trim() && (
        <p className="notice">
          Your limitation notes need qualified review before personalized
          alternatives can be shown. Keep relevant notes; selecting filters does
          not resolve those notes.
        </p>
      )}
      <form
        method="post"
        action="/api/profile"
        className="stack"
        onSubmit={submit}
        aria-busy={pending}
      >
        <fieldset>
          <legend>Movement demands to exclude</legend>
          {restrictionOptions.map((r) => (
            <label className="check" key={r.code}>
              <input
                type="checkbox"
                name="restriction"
                value={r.code}
                defaultChecked={bundle.exercisePreferences.restrictions.includes(
                  r.code,
                )}
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className="check">
          <input
            type="checkbox"
            name="filtersReviewed"
            defaultChecked={bundle.exercisePreferences.reviewed}
          />
          I reviewed these movement filters, including any empty selection
        </label>
        <details>
          <summary>Exercise likes, dislikes and exclusions</summary>
          <p>
            Exclusions remove a movement; likes and dislikes only influence
            ordering after eligibility checks.
          </p>
          {library.map((e) => (
            <div className="field" key={e.id}>
              <label htmlFor={`choice-${e.id}`}>{e.name}</label>
              <select
                id={`choice-${e.id}`}
                name={`choice-${e.id}`}
                defaultValue={
                  bundle.exercisePreferences.choices[e.id] ?? "neutral"
                }
              >
                {preferenceOptions.map((p) => (
                  <option key={p} value={p}>
                    {label(p)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </details>
        {!library.length && (
          <p>
            The reviewed library is empty. Try again later before saving
            exercise preferences.
          </p>
        )}
        <button type="submit" disabled={pending || !library.length}>
          Save movement filters
        </button>
      </form>
    </section>
  );
}
