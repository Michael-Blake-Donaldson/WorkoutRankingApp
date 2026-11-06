"use client";
import { useEffect } from "react";
export function MotionPreference({ value }: { value: string }) {
  useEffect(() => {
    document.body.dataset.motion = value;
  }, [value]);
  return null;
}
