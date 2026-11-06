import type { ReactNode } from "react";
import type { ProfileBundle, ProfileChange } from "@/modules/profile/contracts";
export type Save = (change: ProfileChange) => Promise<boolean>;
export type FormProps = { bundle: ProfileBundle; save: Save; pending: boolean };
export const label = (value: string) => value.replaceAll("_", " ");
export const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export function Field({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{title}</label>
      {children}
    </div>
  );
}
export const text = (data: FormData, name: string) =>
  String(data.get(name) ?? "");
