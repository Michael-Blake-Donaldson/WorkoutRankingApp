import { notFound } from "next/navigation";
import { requireSession } from "@/modules/auth/session";

const sections: Record<string, { title: string; description: string }> = {
  train: {
    title: "Train",
    description:
      "Programs, guided adaptation and workout logging are planned for Phases 3–5. No workout recorder is available yet.",
  },
  ranks: {
    title: "Ranks",
    description:
      "RPG progression, personalized ratings and head-to-head competition are planned for Phases 6–7. No scores or awards have been calculated.",
  },
};
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const details = sections[section];
  if (!details) notFound();
  await requireSession();
  return (
    <main id="main">
      <p className="eyebrow">Foundation · Phase 1</p>
      <h1>{details.title}</h1>
      <section className="card">
        <h2>Coming in a later phase</h2>
        <p>{details.description}</p>
      </section>
    </main>
  );
}
