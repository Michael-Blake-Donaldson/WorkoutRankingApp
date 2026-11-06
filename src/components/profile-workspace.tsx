"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ProfileBundle, ProfileChange } from "@/modules/profile/contracts";
import { BasicsForm } from "./profile/basics-form";
import { BodyMetrics } from "./profile/body-metrics";
import { EquipmentForm } from "./profile/equipment-form";
import { ExercisePreferences } from "./profile/exercise-preferences";
import { days, label } from "./profile/fields";
import { Measurements } from "./profile/measurements";
import { SettingsForm } from "./profile/settings-form";

const subscribe = () => () => {};
export function ProfileWorkspace({
  initial,
  mode,
  library = [],
}: {
  initial: ProfileBundle;
  library?: { id: string; name: string }[];
  mode: "profile" | "onboarding" | "progress";
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [bundle, setBundle] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const lastAttempt = useRef<{ json: string; id: string } | null>(null);
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.body.dataset.motion = bundle.profile?.motionPreference ?? "system";
  }, [bundle.profile?.motionPreference]);
  async function save(change: ProfileChange) {
    if (pending) return false;
    setPending(true);
    setMessage("");
    setError("");
    setConflict(false);
    const payload = { expectedVersion: bundle.profile?.version ?? 0, change };
    const json = JSON.stringify(payload);
    if (lastAttempt.current?.json !== json)
      lastAttempt.current = { json, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-profile-owner": bundle.accountId,
        },
        body: JSON.stringify({
          ...payload,
          clientMutationId: lastAttempt.current.id,
        }),
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "The service is unavailable. Please retry when connected.",
        );
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        const details = body.fields
          ?.map(
            (f: { path: string; message: string }) =>
              `${f.path.replace("change.basics.", "").replace("change.", "")}: ${f.message}`,
          )
          .join(" ");
        throw new Error(
          details || body.error || "Save failed. Retry when connected.",
        );
      }
      setBundle(body);
      lastAttempt.current = null;
      setMessage("Saved to your private profile.");
      status.current?.focus();
      return true;
    } catch (cause) {
      setError(
        cause instanceof TypeError
          ? "Unable to save. Check your connection and retry. Your entries remain on this page."
          : cause instanceof Error
            ? cause.message
            : "Unable to save. Please retry.",
      );
      return false;
    } finally {
      setPending(false);
    }
  }
  async function loadOlder() {
    if (pending || !bundle.nextMeasurementCursor) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/profile?cursor=${encodeURIComponent(bundle.nextMeasurementCursor)}`,
      );
      if (!response.ok)
        throw new Error(
          "Earlier measurements could not be loaded. Please retry.",
        );
      const page: ProfileBundle = await response.json();
      if (page.profile?.version !== bundle.profile?.version) {
        setConflict(true);
        throw new Error(
          "Your profile changed. Reload before loading earlier history.",
        );
      }
      setBundle({
        ...page,
        measurements: [...bundle.measurements, ...page.measurements],
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load earlier measurements.",
      );
    } finally {
      setPending(false);
    }
  }
  const props = { bundle, save, pending: pending || !hydrated };
  const p = bundle.profile;
  const hasHeight = bundle.measurementStatus.height;
  const hasWeight = bundle.measurementStatus.weight;
  const step = !p ? 1 : !bundle.equipment.length ? 2 : 3;
  return (
    <>
      <div
        ref={status}
        tabIndex={-1}
        className="save-status"
        aria-live="polite"
      >
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {conflict && (
          <button
            type="button"
            className="secondary"
            onClick={() => window.location.reload()}
          >
            Reload saved data (discards unsaved changes)
          </button>
        )}
      </div>
      {bundle.hasMoreMeasurements && (
        <p>
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={loadOlder}
          >
            Load earlier measurements
          </button>
        </p>
      )}
      {mode === "onboarding" ? (
        p?.onboardingCompletedAt ? (
          <section className="card">
            <h2>Setup complete</h2>
            <p>
              Your goals, equipment and measurements are saved. Program
              recommendations will be available later.
            </p>
            <Link className="button" href="/profile">
              Edit profile
            </Link>
          </section>
        ) : (
          <>
            <p>
              Step {step} of 3 · Your changes are private and saved between
              steps.
            </p>
            <ol className="steps">
              <li>Training preferences</li>
              <li>Equipment location</li>
              <li>Measurements and review</li>
            </ol>
            {step === 1 && <BasicsForm key={p?.version ?? 0} {...props} />}
            {step === 2 && <EquipmentForm key={p?.version ?? 0} {...props} />}
            {step === 3 && (
              <>
                <Measurements {...props} />
                <section className="card">
                  <h2>Review your setup</h2>
                  <p>
                    {p?.displayName}: {label(p?.primaryGoal ?? "")},{" "}
                    {p?.trainingDays.map((d) => days[d]).join(", ")},{" "}
                    {p?.durationMinutes} minutes per session.
                  </p>
                  <p>
                    {bundle.equipment.map((e) => e.name).join(", ")}. Timezone:{" "}
                    {p?.timezone}.
                  </p>
                  <p>
                    Measurements, limitations and nutrition targets stay
                    private. Changes to a future training program will require
                    your approval.
                  </p>
                  <p>
                    <Link href="/profile">Review or change all settings</Link>
                  </p>
                  <button
                    type="button"
                    disabled={pending || !hydrated || !hasHeight || !hasWeight}
                    onClick={() => save({ operation: "complete-onboarding" })}
                  >
                    Complete setup
                  </button>
                  {(!hasHeight || !hasWeight) && (
                    <p>Add height and weight to complete setup.</p>
                  )}
                </section>
              </>
            )}
          </>
        )
      ) : mode === "profile" ? (
        <>
          {!p?.onboardingCompletedAt && (
            <p className="notice">
              <Link href="/onboarding">Continue your guided setup</Link>
            </p>
          )}
          <BasicsForm {...props} />
          {p && (
            <>
              <SettingsForm {...props} />
              <ExercisePreferences {...props} library={library} />
              <section className="card">
                <h2>Equipment locations</h2>
                <p>
                  Choose the equipment actually available. An empty equipment
                  list means no equipment.
                </p>
                {bundle.equipment.map((e) => (
                  <details key={e.id}>
                    <summary>
                      {e.name}
                      {e.isDefault ? " · Default" : ""} ·{" "}
                      {e.items.length
                        ? e.items.map((i) => label(i.equipmentType)).join(", ")
                        : "No equipment"}
                    </summary>
                    <EquipmentForm {...props} existing={e} />
                    <button
                      type="button"
                      className="secondary"
                      disabled={pending}
                      onClick={() =>
                        save({ operation: "archive-equipment", id: e.id })
                      }
                    >
                      Archive {e.name}
                    </button>
                  </details>
                ))}
                {!bundle.equipment.length && <p>No equipment locations yet.</p>}
                <EquipmentForm {...props} />
              </section>
              <Measurements {...props} />
            </>
          )}
        </>
      ) : p ? (
        <>
          <Measurements {...props} />
          <BodyMetrics bundle={bundle} />
          <p>
            Training records and nutrition logging will be added in later
            phases.
          </p>
        </>
      ) : (
        <p className="card">
          Complete <Link href="/onboarding">your profile setup</Link> to record
          measurements.
        </p>
      )}
    </>
  );
}
