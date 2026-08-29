import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";

const colors = [
  "brown",
  "cadetblue",
  "chocolate",
  "darkcyan",
  "darkgreen",
  "darkmagenta",
  "darkolivegreen",
  "darkred",
  "darkslateblue",
  "darkslategray",
  "dimgray",
  "firebrick",
  "forestgreen",
  "gray",
  "indianred",
  "lightslategray",
  "maroon",
  "mediumvioletred",
  "midnightblue",
  "indigo",
  "rebeccapurple",
  "seagreen",
  "teal",
  "#9747ff",
];

export function ImportColorsPalette({
  calendarColor,
  setCalendarColor,
  showColors,
  setShowColors,
}: {
  calendarColor: string;
  setCalendarColor: (color: string) => void;
  showColors: boolean;
  setShowColors: (show: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const { refs, floatingStyles, context } = useFloating({
    open: showColors,
    onOpenChange: setShowColors,
    placement: "top-start",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  return (
    <>
      <button
        type="button"
        className="mb-7 ml-1 flex items-center gap-2"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: calendarColor }}
        />
        Choose color
      </button>
      {showColors && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="bg-base-300 z-50 grid w-fit grid-cols-4 rounded-md p-2 shadow-xl md:grid-cols-6"
              {...getFloatingProps()}
            >
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="m-0.75 h-5 w-5 rounded-full"
                  style={{ backgroundColor: color }}
                  onClick={() => setCalendarColor(color)}
                >
                  {color === calendarColor && (
                    <span className="icon-[mdi--tick] text-sm" />
                  )}
                </button>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
