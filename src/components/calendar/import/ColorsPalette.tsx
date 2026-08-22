import { useEffect, useRef } from "react";

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
  const colorsMenuRef = useRef<HTMLDivElement>(null);
  const chooseColorButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (
        !colorsMenuRef.current ||
        colorsMenuRef.current.contains(event.target as Node) ||
        !chooseColorButtonRef.current ||
        chooseColorButtonRef.current.contains(event.target as Node)
      ) {
        return;
      }
      setShowColors(false);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [setShowColors]);

  return (
    <div className="mb-7 ml-1 flex items-center">
      <div
        className="mr-2 h-3 w-3 rounded-full"
        style={{ backgroundColor: calendarColor }}
      />
      <button
        type="button"
        onClick={() => setShowColors((showColors) => !showColors)}
        ref={chooseColorButtonRef}
      >
        Choose color
      </button>
      {showColors && (
        <div
          ref={colorsMenuRef}
          className="bg-base-300 absolute -top-45 left-0 z-10 grid w-fit grid-cols-4 rounded-md p-2 shadow-xl md:-top-14 md:left-30 md:grid-cols-6"
        >
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={`m-0.75 h-5 w-5 rounded-full`}
              style={{ backgroundColor: color }}
              onClick={() => setCalendarColor(color)}
            >
              {color === calendarColor && (
                <span className="icon-[mdi--tick] text-sm" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
