import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseAlternatives } from "@/components/exercise-alternatives";
import { requireSession } from "@/modules/auth/session";
import { getCatalogue } from "@/modules/exercises/service";
import { getProfileBundle } from "@/modules/profile/service";

const label = (s: string) => s.replaceAll("_", " ");
export default async function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;
  const exercise = (await getCatalogue()).find((e) => e.slug === slug);
  if (!exercise) notFound();
  const bundle = await getProfileBundle(session.user.id);
  return (
    <main id="main">
      <p>
        <Link href="/train">Back to exercise library</Link>
      </p>
      <h1>{exercise.name}</h1>
      <section className="card">
        <h2>Movement details</h2>
        <dl>
          <dt>Pattern / modality</dt>
          <dd>
            {label(exercise.pattern)} / {label(exercise.modality)}
          </dd>
          <dt>Required equipment (all items)</dt>
          <dd>
            {exercise.equipment.length
              ? exercise.equipment.map(label).join(" + ")
              : "No equipment"}
          </dd>
          <dt>Resistance / laterality</dt>
          <dd>
            {label(exercise.resistance)} / {exercise.laterality}
          </dd>
          <dt>Difficulty</dt>
          <dd>
            {exercise.difficulty}/3 — editorial ordinal, not a load prescription
          </dd>
          <dt>Muscles</dt>
          <dd>
            {exercise.muscles.map((m) => `${m.name} (${m.role})`).join(", ")}
          </dd>
          <dt>Tracking metrics</dt>
          <dd>{exercise.metrics.map(label).join(", ")}</dd>
          <dt>Movement demands</dt>
          <dd>{exercise.demands.map(label).join(", ") || "No listed flags"}</dd>
        </dl>
        <p>Flags are limited filters, not a complete suitability assessment.</p>
        <h2>Instructions</h2>
        <ol>
          {exercise.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h2>Safety and setup</h2>
        <ul>
          {exercise.safetyNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p>
          Use controlled, comfortable movement. Stop for pain; seek qualified
          guidance if suitability or setup is uncertain.
        </p>
        <h2>Content provenance</h2>
        <p>
          Version {exercise.version} · {exercise.reviewedBy} ·{" "}
          {exercise.reviewedAt.slice(0, 10)}
        </p>
        <p>{exercise.license}</p>
        <ul>
          {exercise.sourceUrls.map((url) => (
            <li key={url}>
              <a href={url} rel="noreferrer">
                Publisher reference: {new URL(url).hostname}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <ExerciseAlternatives
        key={`${exercise.id}:${bundle.profile?.version ?? 0}`}
        bundle={{
          accountId: bundle.accountId,
          profile: bundle.profile ? { version: bundle.profile.version } : null,
          equipment: bundle.equipment.map(({ id, name, isDefault }) => ({
            id,
            name,
            isDefault,
          })),
        }}
        exerciseId={exercise.id}
      />
    </main>
  );
}
