import { Navigation } from "@/components/navigation";
import { requireSession } from "@/modules/auth/session";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return (
    <>
      {children}
      <Navigation />
    </>
  );
}
