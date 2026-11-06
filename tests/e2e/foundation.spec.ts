import { createHash, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(url.hostname))
  throw new Error("E2E requires local PostgreSQL");
url.pathname = "/fitness_e2e";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString() }),
});
test.beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE users, invitations, sessions, accounts, verifications, audit_events, request_buckets CASCADE",
  );
  await db.capacity.update({ where: { id: 1 }, data: { occupied: 0 } });
});
test.afterAll(async () => {
  await db.$disconnect();
});

test("invitation through email proof, private navigation and sign-out", async ({
  page,
  context,
  browserName,
}) => {
  const email = `browser-${randomUUID()}@example.test`;
  const token = randomUUID().replaceAll("-", "").repeat(2);
  await db.invitation.create({
    data: {
      email,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  const consoleErrors: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) =>
      console.error(
        `CSP violation: ${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}`,
      ),
    );
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await page.goto(`/invite#token=${token}`);
  await expect(page.getByLabel("Invitation token")).toHaveValue(token);
  expect(page.url()).not.toContain("token=");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "eligible" }),
  ).toBeVisible();
  const messages = await (
    await fetch("http://127.0.0.1:58026/api/v1/messages")
  ).json();
  const mail = messages.messages.find((m: { To: { Address: string }[] }) =>
    m.To.some((t) => t.Address === email),
  );
  expect(mail).toBeTruthy();
  const detail = await (
    await fetch(`http://127.0.0.1:58026/api/v1/message/${mail.ID}`)
  ).json();
  const link = detail.Text.match(
    /https:\/\/localhost:3443\/verify#token=[^\s]+/,
  )?.[0];
  expect(link).toBeTruthy();
  await page.goto(link);
  expect(await db.user.count()).toBe(0); // A scanner GET cannot redeem the proof.
  const proofResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/verify-link") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Confirm sign-in" }).click();
  const proof = await proofResponse;
  const cookieHeaders = (await proof.headersArray())
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value)
    .join("; ");
  expect(cookieHeaders).toMatch(/HttpOnly/i);
  expect(cookieHeaders).toMatch(/Secure/i);
  expect(cookieHeaders).toMatch(/SameSite=Lax/i);
  await expect(
    page.getByRole("heading", { name: "A foundation for your training." }),
  ).toBeVisible();
  await page.waitForLoadState("load");
  const sessionCookie = (await context.cookies()).find((c) =>
    c.name.includes("session_token"),
  );
  expect(sessionCookie?.secure).toBe(true);
  expect(sessionCookie?.httpOnly).toBe(true);
  // Windows WebKit's automation cookie API reports None even when the wire
  // header specifies Lax. Assert the actual header above on both engines.
  if (browserName === "chromium") expect(sessionCookie?.sameSite).toBe("Lax");
  for (const name of ["Train", "Ranks", "Progress", "Profile"]) {
    await page
      .getByRole("navigation")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await page.waitForLoadState("load");
  }
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  const cachedPrivate = await page.evaluate(async () => {
    for (const key of await caches.keys()) {
      for (const entry of await (await caches.open(key)).keys()) {
        const path = new URL(entry.url).pathname;
        if (
          path.startsWith("/api/") ||
          ["/", "/profile", "/train", "/ranks", "/progress"].includes(path)
        )
          return true;
      }
    }
    return false;
  });
  expect(cachedPrivate).toBe(false);
  expect(consoleErrors).toEqual([]);
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  expect(consoleErrors).toEqual([]);
  const signOutResponse = page.waitForResponse(
    (r) => r.url().endsWith("/sign-out") && r.request().method() === "POST",
    { timeout: 10_000 },
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  expect((await signOutResponse).status()).toBe(303);
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(consoleErrors).toEqual([]);
});

test("public auth is accessible at 320px and protects scripts with a request nonce", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  const response = await page.goto("/sign-in");
  const csp = response?.headers()["content-security-policy"];
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(response?.headers()["referrer-policy"]).toBe("same-origin");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const button = await page
    .getByRole("button", { name: "Send sign-in link" })
    .boundingBox();
  expect(button?.height).toBeGreaterThanOrEqual(44);
  // Touch WebKit does not include links in its default Tab traversal.
  if (browserName === "chromium") await page.keyboard.press("Tab");
  else await page.getByRole("link", { name: "Skip to content" }).focus();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/phase1-baseline-${browserName}.png`,
    fullPage: true,
  });
});

test("manifest icons and offline shell work without caching private routes", async ({
  page,
  context,
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toHaveLength(3);
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
  await page.goto("/sign-in");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const cachePaths = await page.evaluate(async () => {
    const keys = await caches.keys();
    const paths: string[] = [];
    for (const key of keys)
      for (const entry of await (await caches.open(key)).keys())
        paths.push(new URL(entry.url).pathname);
    return paths;
  });
  expect(cachePaths).toContain("/offline.html");
  expect(
    cachePaths.some(
      (p) => p.startsWith("/api") || ["/", "/profile", "/sign-in"].includes(p),
    ),
  ).toBe(false);
  await context.setOffline(true);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "You’re offline." }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
