"use client";

import { useState } from "react";
import Link from "next/link";
import { addReflection, useReflections } from "@/lib/reflections";
import { Button } from "@/components/ui/Button";
import { CheckIcon, PencilIcon } from "@/components/ui/icons";

/**
 * "Commit to a next step" — a one-line reflection the student writes after
 * seeing why a score is low. Saving it adds a step to the learning plan.
 */
export function ReflectionPrompt({
  outcomeId,
  outcomeLabel,
}: {
  outcomeId: string;
  outcomeLabel: string;
}) {
  const reflections = useReflections();
  const mine = reflections.filter((r) => r.outcomeId === outcomeId);
  const [text, setText] = useState("");

  function save() {
    const trimmed = text.trim();
    if (!trimmed) return;
    addReflection(outcomeId, outcomeLabel, trimmed);
    setText("");
  }

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <PencilIcon className="h-4 w-4 text-brand" />
        Commit to a next step
      </h2>

      {mine.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {mine.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-2 text-sm text-muted"
            >
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-high" />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="What will you do differently for this outcome?"
          aria-label="Your reflection"
          className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-neutral-400"
        />
        <Button onClick={save} disabled={!text.trim()} className="sm:w-auto">
          Add to my plan
        </Button>
      </div>

      {mine.length > 0 ? (
        <p className="mt-2 text-xs text-muted">
          Saved to{" "}
          <Link href="/plan" className="underline">
            your learning plan
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
