"use client";

import { useEffect, useRef, useState } from "react";

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

/**
 * A closed-by-default dropdown for the MULTI_SELECT question type. Clicking
 * the trigger opens a panel of checkable options; clicking an option toggles
 * it in/out of the response without closing the panel (so several options
 * can be picked in one visit), and clicking outside closes it. A native
 * `<select multiple>` was tried first, but it requires holding Ctrl/Cmd to
 * pick more than one option — no respondent would discover that — and
 * doesn't look like a dropdown (it's always fully expanded).
 */
export function MultiSelectDropdown({ options, selected, onChange }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedSet = new Set(selected);

  function toggle(option: string) {
    const next = new Set(selectedSet);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onChange([...next]);
  }

  const summary = selected.length === 0 ? "Select options" : selected.join(", ");

  return (
    <div className="multiselect-dropdown" ref={containerRef}>
      <button
        type="button"
        className="multiselect-dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected.length === 0 ? "multiselect-dropdown__placeholder" : undefined}>{summary}</span>
        <span className="multiselect-dropdown__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="multiselect-dropdown__panel" role="listbox" aria-multiselectable="true">
          {options.map((option) => (
            <label className="multiselect-dropdown__option" key={option}>
              <input type="checkbox" checked={selectedSet.has(option)} onChange={() => toggle(option)} />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
