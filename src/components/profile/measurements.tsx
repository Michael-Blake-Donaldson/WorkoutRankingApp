"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { metrics } from "@/modules/profile/options";
import { fromSi } from "@/modules/profile/units";
import { Field, type FormProps, text } from "./fields";
export function Measurements({ bundle, save, pending }: FormProps) {
  const [metric, setMetric] = useState<(typeof metrics)[number]>("weight");
  const [corrects, setCorrects] = useState<string | null>(null);
  const recordedTime = useRef<{ key: string; value: string } | null>(null);
  const current = bundle.measurements.find((m) => m.id === corrects);
  const unit =
    metric === "weight"
      ? (bundle.profile?.weightUnit ?? "kg")
      : (bundle.profile?.lengthUnit ?? "cm");
  useEffect(() => {
    if (corrects) document.getElementById("measurement-value")?.focus();
  }, [corrects]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const d = new FormData(form);
    const raw = text(d, "recordedAt");
    const key = JSON.stringify({
      metric,
      unit,
      corrects,
      raw,
      value: text(d, "value"),
      reason: text(d, "reason"),
    });
    if (recordedTime.current?.key !== key)
      recordedTime.current = {
        key,
        value: raw
          ? new Date(`${raw}Z`).toISOString()
          : new Date().toISOString(),
      };
    const ok = await save({
      operation: "record-measurement",
      metric,
      value: text(d, "value"),
      unit,
      recordedAt: recordedTime.current.value,
      correctsId: corrects,
      correctionReason: text(d, "reason"),
    });
    if (ok) {
      setCorrects(null);
      form.reset();
      recordedTime.current = null;
    }
  }
  function correct(id: string) {
    const entry = bundle.measurements.find((m) => m.id === id);
    if (entry) {
      setCorrects(id);
      setMetric(entry.metric);
    }
  }
  return (
    <section className="card">
      <h2>Body measurements</h2>
      <p>
        Record a new entry or correct an earlier one. Corrections retain the
        original entry and reason.
      </p>
      <form
        method="post"
        action="/api/profile"
        className="stack"
        onSubmit={submit}
        aria-busy={pending}
        key={`${corrects}-${unit}`}
      >
        {corrects && (
          <p className="notice">
            Correcting the {current?.metric} entry from {current?.recordedAt}.{" "}
            <button
              type="button"
              className="secondary"
              onClick={() => setCorrects(null)}
            >
              Cancel correction
            </button>
          </p>
        )}
        <Field id="measurement-metric" title="Measurement type">
          <select
            id="measurement-metric"
            value={metric}
            disabled={!!corrects}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
          >
            {metrics.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field id="measurement-value" title={`Value (${unit})`}>
          <input
            id="measurement-value"
            name="value"
            type="number"
            step="0.000001"
            min="0.000001"
            required
            defaultValue={current ? fromSi(current.valueSi, unit) : ""}
          />
        </Field>
        <Field
          id="measurement-time"
          title="Recorded time (UTC; leave blank for now)"
        >
          <input
            id="measurement-time"
            name="recordedAt"
            type="datetime-local"
            step="0.001"
            defaultValue={current?.recordedAt.slice(0, -1) ?? ""}
          />
        </Field>
        {corrects && (
          <Field id="correction-reason" title="Correction reason">
            <input
              id="correction-reason"
              name="reason"
              required
              maxLength={500}
            />
          </Field>
        )}
        <button type="submit" disabled={pending}>
          {pending
            ? "Please wait…"
            : corrects
              ? "Save correction"
              : "Record measurement"}
        </button>
      </form>
      {!bundle.measurements.length ? (
        <p>No measurements recorded yet.</p>
      ) : (
        <>
          <h3>Measurement history</h3>
          <p className="muted">
            Times are shown in UTC. Values use your selected display units.
            Scroll the table horizontally on smaller screens to reach all
            columns.
          </p>
          <section
            className="table-scroll"
            aria-label="Measurement history, scroll horizontally"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need focus to scroll this data region.
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">Private measurement history</caption>
              <thead>
                <tr>
                  <th scope="col">Recorded (UTC)</th>
                  <th scope="col">Type</th>
                  <th scope="col">Value</th>
                  <th scope="col">Status / action</th>
                </tr>
              </thead>
              <tbody>
                {bundle.measurements.map((m) => {
                  const displayUnit =
                    m.metric === "weight"
                      ? (bundle.profile?.weightUnit ?? "kg")
                      : (bundle.profile?.lengthUnit ?? "cm");
                  return (
                    <tr key={m.id}>
                      <td>{m.recordedAt.replace("T", " ").slice(0, 16)}</td>
                      <td>{m.metric}</td>
                      <td>
                        {fromSi(m.valueSi, displayUnit)} {displayUnit}
                      </td>
                      <td>
                        {!m.current ? (
                          "Replaced by correction"
                        ) : (
                          <button
                            type="button"
                            className="secondary"
                            disabled={pending}
                            onClick={() => correct(m.id)}
                            aria-label={`Correct ${m.metric} recorded ${m.recordedAt}`}
                          >
                            Correct
                          </button>
                        )}
                        {m.correctsId && (
                          <p>Correction: {m.correctionReason}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
      {bundle.hasMoreMeasurements && (
        <p className="notice">
          More entries are available. Use “Load earlier measurements” to view
          them.
        </p>
      )}
    </section>
  );
}
