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
      Object.entries(filters).map(([key, values]) => [
        key,
        Object.fromEntries(values.map((v) => [v, true])),
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
  }, []);

  const toggle = (group: string, value: string) => {
    setSelected((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [value]: !prev[group][value],
      },
    }));
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="relative z-50 inline-block text-left" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <span className="h-4 w-4">
            {React.cloneElement(<SearchFiltersIcon />, {})}
          </span>
          Search filters
        </button>

        {open && (
          <div className="relative z-50 mt-2 w-[500px] rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-xl">
            <h2 className="mb-4 text-center text-xl font-bold">
              Search Settings
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
        )}
      </div>
    </>
  );
};

export default SearchFilters;
