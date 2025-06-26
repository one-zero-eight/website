import {
  useFloating,
  useDismiss,
  useClick,
  useRole,
  useInteractions,
} from "@floating-ui/react";
import { useState } from "react";
import SearchFiltersModal from "./SearchFiltersModal";
import SearchFiltersButton from "./SearchFiltersButton";

type SearchFiltersProps = {
  selected: Record<string, Record<string, boolean>>;
  checks: (group: string, value: string) => void;
  applyFilters: () => void;
};

const SearchFilters = ({
  selected,
  checks,
  applyFilters,
}: SearchFiltersProps) => {
  const [open, setOpen] = useState(false);

  const { refs, context } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: "fixed",
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps: getProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return (
    <>
      <SearchFiltersButton ref={refs.setReference} {...getReferenceProps()} />
      <SearchFiltersModal
        open={open}
        refs={refs}
        context={context}
        getFloatingProps={getProps}
        selected={selected}
        checks={checks}
        onClose={() => setOpen(false)}
        onApply={() => applyFilters()}
      />
    </>
  );
};

export default SearchFilters;
