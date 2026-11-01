"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function Navigation() {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {[
        ["/", "Home"],
        ["/train", "Train"],
        ["/ranks", "Ranks"],
        ["/progress", "Progress"],
        ["/profile", "Profile"],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
