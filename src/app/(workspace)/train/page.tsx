import Link from "next/link";
import { ExerciseLibrary } from "@/components/exercise-library";
import { requireSession } from "@/modules/auth/session";
import { getCatalogue } from "@/modules/exercises/service";
export default async function TrainPage() {
  await requireSession();
  const library = await getCatalogue();
  return (
    <main id="main">
      <h1>Train</h1>
      <p>
        Browse the curated exercise library and compare movements against your
        saved equipment and filters. Programs and workout recording arrive in
        later phases.
      </p>
      <p>
        This limited library has editorial checks, not clinical clearance.
        Instructions are general guidance; seek qualified help with suitability
        or uncertain setup and stop for pain.
      </p>
      <p>
        <Link href="/profile#movement-filters">
          Review movement filters and preferences
        </Link>
      </p>
      <ExerciseLibrary library={library} />
    </main>
  );
}
