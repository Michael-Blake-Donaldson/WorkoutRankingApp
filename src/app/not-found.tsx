import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main">
      <h1>Page not found</h1>
      <p>This address does not point to an available page.</p>
      <Link className="button" href="/">
        Go home
      </Link>
    </main>
  );
}
