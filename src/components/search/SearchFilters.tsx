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

const SearchFilters = () => {
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

  const [selected, setSelected] = useState<
    Record<string, Record<string, boolean>>
  >({
    fileType: {
      PDF: false,
      "Web-site": false,
      "Text file": false,
      Other: false,
    },
    category: {
      University: false,
      "Innopolis city": false,
      Campus: false,
      Other: false,
    },
    source: {
      Moodle: false,
      Eduwiki: false,
      Sport: false,
      "Campus life": false,
      Other: false,
    },
  });

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
      <SearchFiltersButton ref={refs.setReference} {...getReferenceProps()} />
      <SearchFiltersModal
        open={open}
        refs={refs}
        context={context}
        getFloatingProps={getProps}
        selected={selected}
        toggle={toggle}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default SearchFilters;
