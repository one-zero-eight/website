import {
  autoUpdate,
  offset,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  FloatingPortal,
  flip,
  shift,
} from "@floating-ui/react";
import { useState } from "react";
import SelectSourcesFilterButton from "./SelectSourcesFilterButton";
import SelectSourcesFilterModal from "./SelectSourcesFilterModal";

type SelectSourcesFilterProps = {
  selected: Record<string, Record<string, boolean>>;
  checks: (group: string, value: string) => void;
  applyFilters: () => void;
};

const filters = {
  source: [
    { displayName: "Campus life", internalName: "campuslife" },
    { displayName: "Eduwiki", internalName: "eduwiki" },
    { displayName: "Hotel", internalName: "hotel" },
    { displayName: "Moodle", internalName: "moodle" },
    { displayName: "Maps", internalName: "maps" },
    { displayName: "Residents", internalName: "residents" },
    { displayName: "InNoHassle", internalName: "innohassle" },
    { displayName: "My University", internalName: "myuni" },
    { displayName: "ITHelp Wiki", internalName: "ithelp" },
  ],
};

const SelectSourcesFilter = ({
  selected,
  checks,
  applyFilters,
}: SelectSourcesFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    placement: "bottom-end",
    middleware: [offset(8), flip(), shift()],
  });

  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getFloatingProps, getReferenceProps } = useInteractions([
    dismiss,
    role,
  ]);

  return (
    <>
      <SelectSourcesFilterButton
        open={isOpen}
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={() => setIsOpen((prev) => !prev)}
      />
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              width: 170,
              zIndex: 10,
              transformOrigin: "top right",
            }}
            {...getFloatingProps()}
          >
            <SelectSourcesFilterModal
              open={isOpen}
              filters={filters}
              selected={selected}
              checks={checks}
              onApply={applyFilters}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default SelectSourcesFilter;
