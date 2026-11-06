import { MotionPreference } from "@/components/motion-preference";
import { Navigation } from "@/components/navigation";
import { requireSession } from "@/modules/auth/session";
import { getMotionPreference } from "@/modules/profile/service";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return (
    <>
      <MotionPreference value={await getMotionPreference(session.user.id)} />
      {children}
      <Navigation />
    </>
  );
}
