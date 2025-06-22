import {
  FloatingPortal,
  FloatingOverlay,
  type FloatingContext,
  type UseFloatingReturn,
} from "@floating-ui/react";
import React from "react";
import { DefaultButton } from "@/components/search/DefaultButton";

type Props = {
  open: boolean;
  context: FloatingContext;
  refs: UseFloatingReturn["refs"];
  getFloatingProps: (
    userProps?: React.HTMLProps<HTMLElement>,
  ) => Record<string, unknown>;
  selected: Record<string, Record<string, boolean>>;
  toggle: (group: string, value: string) => void;
  onClose: () => void;
};

const filters = {
  fileType: ["PDF", "Web-site", "Text file", "Other"],
  category: ["University", "Innopolis city", "Campus", "Other"],
  source: ["Moodle", "Eduwiki", "Sport", "Campus life", "Other"],
};

const SearchFiltersModal = ({
  open,
  refs,
  getFloatingProps,
  selected,
  toggle,
  onClose,
}: Props) => {
  if (!open) return null;

  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        onClick={onClose}
        className="z-40 grid place-items-center bg-black/50"
      >
        <div
          ref={refs.setFloating}
          {...getFloatingProps()}
          onClick={(e) => e.stopPropagation()}
          className="z-50 w-[500px] rounded-xl border border-gray-400 bg-floating p-6 text-black shadow-xl dark:bg-[#262626] dark:text-white"
        >
          <h2 className="mb-4 text-center text-xl font-bold">Search Filters</h2>
          <div className="grid grid-cols-3 gap-6">
            {Object.entries(filters).map(([group, values]) => (
              <div key={group} className="flex flex-col items-center">
                <div className="flex flex-col items-start text-left">
                  <h3 className="mb-2 text-sm font-semibold capitalize">
                    {group.replace(/([A-Z])/g, " $1")}
                  </h3>
                  {values.map((value) => (
                    <label
                      key={value}
                      className="mb-1 flex items-center gap-1 text-sm"
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
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <DefaultButton content="Done" onClick={onClose}></DefaultButton>
          </div>
        </div>
      </FloatingOverlay>
    </FloatingPortal>
  );
};

export default SearchFiltersModal;
