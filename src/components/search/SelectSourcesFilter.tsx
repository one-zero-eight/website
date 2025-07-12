import {
  autoUpdate,
  offset,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  FloatingPortal,
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
    middleware: [offset(8)],
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
              width:
                (refs.reference.current as HTMLElement | null)?.offsetWidth ??
                "auto",
              zIndex: 10,
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
