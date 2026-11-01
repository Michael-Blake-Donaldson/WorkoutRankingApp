// Native form submission also works before hydration and with assistive browsers.
export function SignOut() {
  return (
    <form action="/sign-out" method="post">
      <button type="submit" className="secondary">
        Sign out
      </button>
    </form>
  );
}
