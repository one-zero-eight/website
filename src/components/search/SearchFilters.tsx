import React, { useState, useRef, useEffect } from "react";
import SearchFiltersIcon from "./icons/SearchFilters";

const filters = {
  fileType: ["PDF", "Web-site", "Text file", "Other"],
  category: ["University", "Innopolis city", "Campus", "Other"],
  source: ["Moodle", "Eduwiki", "Sport", "Campus life", "Other"],
};

const SearchFilters = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [
        k,
        Object.fromEntries(v.map((val) => [val, true])),
      ]),
    ),
  );

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Spacebar") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const toggle = (group: string, value: string) =>
    setSelected((prev) => ({
      ...prev,
      [group]: { ...prev[group], [value]: !prev[group][value] },
    }));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Spacebar") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        >
          <div
            className="w-[500px] rounded-xl border border-gray-400 bg-floating p-6 text-black shadow-xl dark:bg-[#262626] dark:text-white"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
          >
            <h2 className="mb-4 text-center text-xl font-bold">
              Search Filters
            </h2>

            <div className="grid grid-cols-3 gap-6">
              {Object.entries(filters).map(([group, values]) => (
                <div key={group}>
                  <h3 className="text-md mb-2 font-semibold capitalize">
                    {group.replace(/([A-Z])/g, " $1")}
                  </h3>
                  {values.map((value) => (
                    <label
                      key={value}
                      className="mb-1 flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selected[group][value]}
                        onChange={() => toggle(group, value)}
                        className="accent-purple-500"
                      />
                      {value}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md bg-purple-600 px-6 py-2 font-semibold text-white hover:bg-purple-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative z-40 inline-block text-left" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-400 dark:text-[#8A8A8A] dark:hover:text-[#B5B5B5]"
        >
          <span className="h-5 w-5">
            <SearchFiltersIcon />
          </span>
          Search filters
        </button>
      </div>
    </>
  );
};

export default SearchFilters;
