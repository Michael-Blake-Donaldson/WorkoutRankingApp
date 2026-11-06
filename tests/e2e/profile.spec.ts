import { createHash, randomBytes, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(url.hostname))
  throw new Error("Local E2E database required");
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

test("health forms stay disabled before hydration and never submit data in the URL", async ({
  page,
  context,
  browser,
}) => {
  await join(page);
  await page.goto("/profile");
  await basics(page);
  const withoutJs = await browser.newContext({
    javaScriptEnabled: false,
    ignoreHTTPSErrors: true,
    storageState: await context.storageState(),
  });
  try {
    const plain = await withoutJs.newPage();
    await plain.goto("https://localhost:3443/profile");
    await expect(
      plain
        .locator("form")
        .filter({ has: plain.locator('input[name="displayName"]') })
        .locator('button[type="submit"]'),
    ).toBeDisabled();
    // Streamed content remains hidden without JavaScript in WebKit. Check the
    // actual server-rendered controls and native form method, including that case.
    const methods = await plain
      .locator("form")
      .evaluateAll((forms) =>
        forms.map((f) => f.getAttribute("method")?.toLowerCase()),
      );
    expect(methods.length).toBeGreaterThan(0);
    expect(methods.every((method) => method === "post")).toBe(true);
    await plain.keyboard.press("Enter");
    await expect(plain).toHaveURL("https://localhost:3443/profile");
    const saved = await (await page.request.get("/api/profile")).json();
    expect(saved.profile.displayName).toBe("Jordan");
  } finally {
    await withoutJs.close();
  }
});

async function join(page: Page) {
  const email = `phase2-${randomUUID()}@example.test`;
  const token = randomBytes(32).toString("hex");
  await db.invitation.create({
    data: {
      email,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  await page.goto(`/invite#token=${token}`);
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
  if (!mail) throw new Error("Local SMTP message missing");
  const detail = await (
    await fetch(`http://127.0.0.1:58026/api/v1/message/${mail.ID}`)
  ).json();
  const link = detail.Text.match(
    /https:\/\/localhost:3443\/verify#token=[^\s]+/,
  )?.[0];
  if (!link) throw new Error("Missing proof link");
  await page.goto(link);
  await page.getByRole("button", { name: "Confirm sign-in" }).click();
  await expect(
    page.getByRole("heading", { name: "A foundation for your training." }),
  ).toBeVisible();
  await page.waitForLoadState("load");
  return email;
}
async function submit(page: Page, name: string, status = 200) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/profile" &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name, exact: true }).click();
  const result = await response;
  expect(result.status(), await result.text()).toBe(status);
  if (status === 200)
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Saved to your private profile." }),
    ).toBeVisible();
}
async function basics(page: Page) {
  await page.getByLabel("Display name", { exact: true }).fill("Jordan");
  await page
    .getByLabel("Primary goal", { exact: true })
    .selectOption("strength");
  await page.getByRole("checkbox", { name: "Monday", exact: true }).check();
  await page.getByRole("checkbox", { name: "Wednesday", exact: true }).check();
  await page
    .getByLabel("Limitations or restrictions", { exact: false })
    .fill("Private test restriction");
  await submit(page, "Save training preferences");
}

test("onboarding, private settings, equipment and corrected BMI persist across reloads", async ({
  page,
  browserName,
}) => {
  await join(page);
  await page.goto("/onboarding");
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
  await basics(page);
  await expect(page.getByText(/Step 2 of 3/)).toBeVisible();
  await page.getByLabel("Location name", { exact: true }).fill("Home");
  await submit(page, "Add equipment location");
  await expect(page.getByText(/Step 3 of 3/)).toBeVisible();
  for (const [metric, value, date] of [
    ["height", "180", "2026-01-01T12:00"],
    ["weight", "80", "2026-01-02T12:00"],
  ]) {
    await page
      .getByLabel("Measurement type", { exact: true })
      .selectOption(metric);
    await page.getByLabel(/^Value \(/).fill(value);
    await page.getByLabel("Recorded time", { exact: false }).fill(date);
    await submit(page, "Record measurement");
  }
  await submit(page, "Complete setup");
  await expect(
    page.getByRole("heading", { name: "Setup complete" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Setup complete" }),
  ).toBeVisible();
  await page.goto("/profile");
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Unsubmitted name draft");
  await page
    .getByLabel("Display weight in", { exact: true })
    .selectOption("lb");
  await page
    .getByLabel("Display lengths in", { exact: true })
    .selectOption("in");
  await page
    .getByLabel("Motion preference", { exact: true })
    .selectOption("reduce");
  await page
    .getByRole("checkbox", { name: "Share competition summaries", exact: true })
    .check();
  await submit(page, "Save privacy and preferences");
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Unsubmitted name draft",
  );
  await expect(page.locator("body")).toHaveAttribute("data-motion", "reduce");
  await page.reload();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Jordan",
  );
  await expect(
    page.getByRole("cell", { name: "176.37 lb", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Correct weight recorded/ }).click();
  await page.getByLabel("Value (lb)", { exact: true }).fill("177");
  await page
    .getByLabel("Correction reason", { exact: true })
    .fill("Scale entry typo");
  await submit(page, "Save correction");
  await expect(
    page.getByText("Replaced by correction", { exact: true }),
  ).toBeVisible();
  const add = page.locator("form").filter({
    has: page.getByRole("heading", {
      name: "Add equipment location",
      exact: true,
    }),
  });
  await add.getByLabel("Location name", { exact: true }).fill("Gym");
  await add.getByRole("checkbox", { name: "dumbbell", exact: true }).check();
  await add
    .getByLabel("dumbbell min load (kg, optional)", { exact: true })
    .fill("2.5");
  await add
    .getByLabel("dumbbell max load (kg, optional)", { exact: true })
    .fill("50");
  await add
    .getByLabel("dumbbell load increment (kg, optional)", { exact: true })
    .fill("2.5");
  await add
    .getByRole("checkbox", { name: "Make this the default location" })
    .check();
  await submit(page, "Add equipment location");
  await expect(
    page.locator("summary").filter({ hasText: "Gym · Default" }),
  ).toBeVisible();
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "BMI history" }),
  ).toBeVisible();
  await expect(
    page.getByText("2026-01-02: 24.8", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-motion", "reduce");
  await page.setViewportSize({ width: 320, height: 800 });
  const layout = await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= window.innerWidth,
    offenders: [...document.querySelectorAll("main *")]
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth)
      .map((e) => ({
        tag: e.tagName,
        id: e.id,
        className: e.className,
        width: e.getBoundingClientRect().width,
      })),
  }));
  expect(layout.fits, JSON.stringify(layout.offenders)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/phase2-progress-${browserName}.png`,
    fullPage: true,
  });
});

test.describe("network recovery with intercepted responses", () => {
  test.use({ serviceWorkers: "block" });
  test("conflicts preserve unsaved input and dropped acknowledgements replay without duplicate measurements", async ({
    page,
  }) => {
    await join(page);
    await page.goto("/profile");
    await basics(page);
    const saved = await (await page.request.get("/api/profile")).json();
    await page
      .getByLabel("Display name", { exact: true })
      .fill("Unsaved conflict draft");
    const external = await page.request.post("/api/profile", {
      headers: {
        origin: "https://localhost:3443",
        "x-profile-owner": saved.accountId,
      },
      data: {
        clientMutationId: randomUUID(),
        expectedVersion: saved.profile.version,
        change: {
          operation: "save-settings",
          settings: {
            weightUnit: "kg",
            lengthUnit: "cm",
            shareCompetitionSummary: false,
            audioEnabled: true,
            hapticsEnabled: false,
            motionPreference: "system",
          },
        },
      },
    });
    expect(external.status()).toBe(200);
    await submit(page, "Save training preferences", 409);
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
      "Unsaved conflict draft",
    );
    await page
      .getByRole("button", {
        name: "Reload saved data (discards unsaved changes)",
      })
      .click();
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
      "Jordan",
    );
    await page.getByLabel("Value (kg)", { exact: true }).fill("81");
    let dropped = false;
    await page.route("**/api/profile", async (route) => {
      const body = route.request().postDataJSON();
      if (
        !dropped &&
        route.request().method() === "POST" &&
        body.change?.operation === "record-measurement"
      ) {
        dropped = true;
        const result = await route.fetch();
        expect(result.status()).toBe(200);
        await route.abort("failed");
      } else await route.continue();
    });
    await page
      .getByRole("button", { name: "Record measurement", exact: true })
      .click();
    await expect.poll(() => dropped).toBe(true);
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: /fetch|network|load|connect/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Value (kg)", { exact: true })).toHaveValue(
      "81",
    );
    await submit(page, "Record measurement");
    const final = await (await page.request.get("/api/profile")).json();
    expect(final.measurements).toHaveLength(1);
    expect(final.measurements[0].valueSi).toBe("81");
  });
});
