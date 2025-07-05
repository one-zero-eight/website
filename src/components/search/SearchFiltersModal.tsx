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
  checks: (group: string, value: string) => void;
  onClose: () => void;
  onApply: () => void;
};

const filters = {
  fileType: [
    { displayName: "PDF", internalName: "pdf" },
    { displayName: "Web-site", internalName: "link_to_source" },
  ],
  source: [
    { displayName: "Campus life", internalName: "campuslife" },
    { displayName: "Eduwiki", internalName: "eduwiki" },
    { displayName: "Hotel", internalName: "hotel" },
    { displayName: "Moodle", internalName: "moodle" },
    { displayName: "Maps", internalName: "maps" },
    { displayName: "Residents", internalName: "residents" },
  ],
};

const SearchFiltersModal = ({
  open,
  refs,
  getFloatingProps,
  selected,
  checks,
  onClose,
  onApply,
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
          onKeyDown={() => {}}
          className="z-50 w-[500px] rounded-xl border border-gray-400 bg-floating p-6 text-black shadow-xl dark:bg-[#262626] dark:text-white"
        >
          <h2 className="mb-4 text-center text-xl font-bold">Search Filters</h2>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(filters).map(([group, values]) => (
              <div key={group} className="flex flex-col items-center">
                <div className="flex flex-col items-start text-left">
                  <h3 className="mb-2 text-sm font-semibold capitalize">
                    {group.replace(/([A-Z])/g, " $1")}
                  </h3>
                  {values.length <= 4 ? (
                    values.map((value) => (
                      <label
                        key={value.displayName}
                        className="mb-1 flex items-center gap-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected[group][value.internalName]}
                          onChange={() => checks(group, value.internalName)}
                          className="accent-purple-500"
                        />
                        {value.displayName}
                      </label>
                    ))
                  ) : (
                    <div className="grid h-20 gap-x-4 gap-y-1 overflow-auto pr-4">
                      {values.map((value) => (
                        <label
                          key={value.displayName}
                          className="flex items-center gap-1 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selected[group][value.internalName]}
                            onChange={() => checks(group, value.internalName)}
                            className="accent-purple-500"
                          />
                          {value.displayName}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <DefaultButton
              content="Done"
              onClick={() => {
                onApply();
                onClose();
              }}
            ></DefaultButton>
          </div>
        </div>
      </FloatingOverlay>
    </FloatingPortal>
  );
};

export default SearchFiltersModal;
