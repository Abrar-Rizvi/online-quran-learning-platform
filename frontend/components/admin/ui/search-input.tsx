"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CloseIcon } from "../admin-icons";

const DEBOUNCE_MS = 300;

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/**
 * Debounced URL search box: writes `?{param}=` with router.replace, keeps
 * every other param except `page` (back to page 1) and any params in
 * `resetParams` (e.g. an open detail view).
 */
export function SearchInput({
  label,
  placeholder,
  param = "q",
  resetParams = [],
  className,
}: {
  label: string;
  placeholder: string;
  param?: string;
  resetParams?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(param) ?? "";

  const [value, setValue] = useState(urlValue);
  // Follow URL changes made elsewhere (e.g. "Clear filters") without fighting the user's typing.
  const [lastUrlValue, setLastUrlValue] = useState(urlValue);
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    if (urlValue !== value.trim()) setValue(urlValue);
  }

  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);
  const inputId = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set(param, trimmed);
    else params.delete(param);
    params.delete("page");
    for (const key of resetParams) params.delete(key);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function onChange(next: string) {
    setValue(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => push(next), DEBOUNCE_MS);
  }

  return (
    <div className={cn("relative", className)} role="search">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-busy={pending || undefined}
        className={cn(inputClasses, "h-11 pr-12 pl-11 [&::-webkit-search-cancel-button]:appearance-none")}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            window.clearTimeout(timer.current);
            setValue("");
            push("");
          }}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--green-900)] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-[var(--focus-ring-color)]"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
