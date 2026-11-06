"use client";
import Link from "next/link";
import { useState } from "react";
import { modalities, patterns } from "@/modules/exercises/options";
import type { ExerciseDto } from "@/modules/exercises/types";
import { equipmentTypes } from "@/modules/profile/options";

const label = (s: string) => s.replaceAll("_", " ");
export function ExerciseLibrary({ library }: { library: ExerciseDto[] }) {
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState("");
  const [pattern, setPattern] = useState("");
  const [modality, setModality] = useState("");
  const filtered = library.filter(
    (e) =>
      (!query ||
        [e.name, ...e.aliases, ...e.muscles.map((m) => m.name)]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())) &&
      (!equipment ||
        (equipment === "none"
          ? !e.equipment.length
          : e.equipment.includes(
              equipment as (typeof equipmentTypes)[number],
            ))) &&
      (!pattern || e.pattern === pattern) &&
      (!modality || e.modality === modality),
  );
  return (
    <>
      <section className="card stack" aria-label="Library filters">
        <label htmlFor="exercise-search">Search exercises or muscles</label>
        <input
          id="exercise-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={100}
        />
        <label htmlFor="exercise-equipment">Required equipment</label>
        <select
          id="exercise-equipment"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          <option value="">Any equipment</option>
          <option value="none">No equipment</option>
          {equipmentTypes.map((x) => (
            <option key={x} value={x}>
              {label(x)}
            </option>
          ))}
        </select>
        <label htmlFor="exercise-pattern">Movement pattern</label>
        <select
          id="exercise-pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        >
          <option value="">Any pattern</option>
          {patterns.map((x) => (
            <option key={x} value={x}>
              {label(x)}
            </option>
          ))}
        </select>
        <label htmlFor="exercise-modality">Modality</label>
        <select
          id="exercise-modality"
          value={modality}
          onChange={(e) => setModality(e.target.value)}
        >
          <option value="">Any modality</option>
          {modalities.map((x) => (
            <option key={x} value={x}>
              {label(x)}
            </option>
          ))}
        </select>
      </section>
      <p role="status">{filtered.length} exercises shown</p>
      {!filtered.length && (
        <p className="card">
          No matching exercises in this limited library. Change the filters to
          browse other entries.
        </p>
      )}
      <ul className="exercise-list">
        {filtered.map((e) => (
          <li key={e.id} className="card">
            <h2>
              <Link href={`/train/exercises/${e.slug}`}>{e.name}</Link>
            </h2>
            <p>
              {label(e.pattern)} · {label(e.modality)} · Difficulty{" "}
              {e.difficulty}/3
            </p>
            <p>
              Requires:{" "}
              {e.equipment.length
                ? e.equipment.map(label).join(" + ")
                : "No equipment"}
            </p>
            <p>
              Primary muscles:{" "}
              {e.muscles
                .filter((m) => m.role === "primary")
                .map((m) => m.name)
                .join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
