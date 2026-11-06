import Decimal from "decimal.js";
import type { MeasurementDto } from "./contracts";

export function toSi(value: string, unit: "kg" | "lb" | "cm" | "in") {
  const factor = { kg: "1", lb: "0.45359237", cm: "0.01", in: "0.0254" }[unit];
  return new Decimal(value).mul(factor).toDecimalPlaces(6).toFixed(6);
}
export function fromSi(value: string, unit: "kg" | "lb" | "cm" | "in") {
  return new Decimal(value)
    .div({ kg: "1", lb: "0.45359237", cm: "0.01", in: "0.0254" }[unit])
    .toDecimalPlaces(3)
    .toString();
}
export function bmi(weightKg: string, heightM: string) {
  if (new Decimal(weightKg).lte(0) || new Decimal(heightM).lte(0)) return null;
  return new Decimal(weightKg)
    .div(new Decimal(heightM).pow(2))
    .toDecimalPlaces(1)
    .toFixed(1);
}
// Each weight uses the most recent height recorded at or before its timestamp.
export function bmiHistory(entries: MeasurementDto[]) {
  const current = entries
    .filter((m) => m.current)
    .sort(
      (a, b) =>
        a.recordedAt.localeCompare(b.recordedAt) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
  return current
    .filter((m) => m.metric === "weight")
    .map((weight) => {
      const height = current
        .filter(
          (m) => m.metric === "height" && m.recordedAt <= weight.recordedAt,
        )
        .at(-1);
      return {
        id: weight.id,
        recordedAt: weight.recordedAt,
        value: height ? bmi(weight.valueSi, height.valueSi) : null,
      };
    });
}
