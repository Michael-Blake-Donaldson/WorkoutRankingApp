export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
export function localDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function localInstant(
  date: string,
  time: string,
  timezone: string,
): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const numeric = (value: Date) => {
    const parts = formatter.formatToParts(value);
    const get = (key: string) =>
      Number(parts.find((p) => p.type === key)?.value);
    return Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
    );
  };
  const guess = Date.parse(`${date}T${time}:00Z`);
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const stamp = guess + hours * 3600000;
    offsets.add(numeric(new Date(stamp)) - stamp);
  }
  const matches = [...offsets]
    .map((offset) => guess - offset)
    .filter((stamp) => numeric(new Date(stamp)) === guess);
  if (matches.length !== 1)
    throw new Error(
      `Local start ${date} ${time} is ${matches.length ? "ambiguous" : "nonexistent"} in ${timezone}. Choose another start time.`,
    );
  return new Date(matches[0]);
}
