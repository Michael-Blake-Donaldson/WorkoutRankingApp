"use client";
import { type FormEvent, useState } from "react";
import type { EquipmentDto } from "@/modules/profile/contracts";
import { equipmentTypes } from "@/modules/profile/options";
import { Field, type FormProps, label, text } from "./fields";
export function EquipmentForm({
  save,
  pending,
  existing,
}: FormProps & { existing?: EquipmentDto }) {
  const prefix = existing?.id ?? "new-location";
  const [chosen, setChosen] = useState<string[]>(
    existing?.items.map((i) => i.equipmentType) ?? [],
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const d = new FormData(form);
    const ok = await save({
      operation: "save-equipment",
      id: existing?.id ?? null,
      name: text(d, "name"),
      location: text(d, "location") as EquipmentDto["location"],
      isDefault: d.has("default"),
      items: chosen.map((e) => ({
        equipmentType: e as EquipmentDto["items"][number]["equipmentType"],
        minLoadKg: text(d, `${e}-min`) || null,
        maxLoadKg: text(d, `${e}-max`) || null,
        incrementKg: text(d, `${e}-increment`) || null,
      })),
    });
    if (ok && !existing) {
      form.reset();
      setChosen([]);
    }
  }
  return (
    <form
      method="post"
      action="/api/profile"
      className="stack equipment-form"
      onSubmit={submit}
      aria-busy={pending}
    >
      <h3>{existing ? "Edit location" : "Add equipment location"}</h3>
      <Field id={`${prefix}-name`} title="Location name">
        <input
          id={`${prefix}-name`}
          name="name"
          required
          maxLength={80}
          defaultValue={existing?.name ?? ""}
          placeholder="For example, Home"
        />
      </Field>
      <Field id={`${prefix}-location`} title="Environment">
        <select
          id={`${prefix}-location`}
          name="location"
          defaultValue={existing?.location ?? "home"}
        >
          {["home", "gym", "travel"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <label className="check">
        <input
          type="checkbox"
          name="default"
          defaultChecked={existing?.isDefault}
        />
        Make this the default location
      </label>
      <fieldset>
        <legend>
          Available equipment (leave all unchecked for no equipment)
        </legend>
        {equipmentTypes.map((e) => (
          <div key={e}>
            <label className="check">
              <input
                type="checkbox"
                checked={chosen.includes(e)}
                onChange={(ev) =>
                  setChosen((prior) =>
                    ev.target.checked
                      ? [...prior, e]
                      : prior.filter((x) => x !== e),
                  )
                }
              />
              {label(e)}
            </label>
            {chosen.includes(e) && (
              <div className="load-fields">
                {["min", "max", "increment"].map((kind) => {
                  const key =
                    kind === "min"
                      ? "minLoadKg"
                      : kind === "max"
                        ? "maxLoadKg"
                        : "incrementKg";
                  return (
                    <Field
                      key={kind}
                      id={`${prefix}-${e}-${kind}`}
                      title={`${label(e)} ${kind === "increment" ? "load increment" : `${kind} load`} (kg, optional)`}
                    >
                      <input
                        id={`${prefix}-${e}-${kind}`}
                        name={`${e}-${kind}`}
                        type="number"
                        min="0.001"
                        max="2000"
                        step="0.001"
                        defaultValue={
                          existing?.items.find((i) => i.equipmentType === e)?.[
                            key
                          ] ?? ""
                        }
                      />
                    </Field>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </fieldset>
      <p className="muted">
        Load configuration uses kg as marked. Unknown loads can be left blank.
        Equipment changes do not generate or approve a training program.
      </p>
      <button type="submit" disabled={pending}>
        {existing ? "Save equipment location" : "Add equipment location"}
      </button>
    </form>
  );
}
