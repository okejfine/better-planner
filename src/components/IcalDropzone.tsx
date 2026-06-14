"use client";

import { useRef, useState, useTransition } from "react";
import { importIcal } from "@/actions/ical";
import { clearImportedEvents } from "@/actions/wedding";
import { cn } from "@/lib/utils";

export function IcalDropzone({ hasExisting }: { hasExisting: boolean }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".ics")) {
      setStatus({ type: "error", msg: "Please drop an .ics calendar file." });
      return;
    }
    const text = await file.text();
    startTransition(async () => {
      try {
        const result = await importIcal(text, file.name);
        setStatus({
          type: "success",
          msg: `Imported ${result.imported} event${result.imported === 1 ? "" : "s"}${result.skipped ? ` (${result.skipped} outside window, skipped)` : ""}.`,
        });
      } catch (err) {
        setStatus({
          type: "error",
          msg: err instanceof Error ? err.message : "Import failed.",
        });
      }
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = "";
  }

  function handleClear() {
    startTransition(async () => {
      try {
        await clearImportedEvents();
        setStatus({ type: "success", msg: "Your calendar drops removed." });
      } catch {
        setStatus({ type: "error", msg: "Could not remove events." });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-wider text-[10px] text-stone-400 font-medium">
          Calendar drops
        </span>
        {hasExisting && (
          <button
            type="button"
            onClick={handleClear}
            disabled={pending}
            className="text-[10px] text-stone-400 hover:text-rose-600 transition"
          >
            Remove my drops
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop .ics file or click to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed px-4 py-3 text-center cursor-pointer transition text-xs",
          dragging
            ? "border-indigo-400 bg-indigo-50 text-indigo-700"
            : "border-stone-200 bg-stone-50/60 text-stone-500 hover:border-stone-300 hover:bg-stone-50",
          pending && "opacity-60 pointer-events-none",
        )}
      >
        {pending
          ? "Importing…"
          : "Drop your .ics file here, or click to browse"}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={handleChange}
      />

      {status && (
        <div
          className={cn(
            "text-xs px-3 py-2 rounded-lg",
            status.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200",
          )}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
}
