import { $maps } from "@/api/maps";
import { Trans, useLingui } from "@lingui/react/macro";
import { SchemaArea } from "@/api/maps/types";
import { getAreaTitle } from "@/components/maps/area-label.ts";
import { cn } from "@/lib/ui/cn";
import { useMemo, useState } from "react";
import { eventFieldClass } from "./formStyles";

const MAX_SUGGESTIONS = 30;

type LocationSuggestion = {
  key: string;
  /** Canonical EN title stored in the form value */
  title: string;
  displayTitle: string;
  sceneTitle: string;
};

function areaSearchText(area: SchemaArea) {
  return [area.title, area.ru_title, area.description, ...(area.people ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function LocationField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useLingui();
  const [open, setOpen] = useState(false);
  const { data: scenes } = $maps.useQuery("get", "/scenes/");

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query || !scenes) {
      return [];
    }

    const matches: LocationSuggestion[] = [];
    for (const scene of scenes) {
      for (const [index, area] of (scene.areas ?? []).entries()) {
        if (!area.title && !area.ru_title) {
          continue;
        }
        if (!areaSearchText(area).includes(query)) {
          continue;
        }
        matches.push({
          key: `${scene.scene_id}-${area.svg_polygon_id ?? index}`,
          title: area.title ?? area.ru_title ?? "",
          displayTitle: getAreaTitle(area, i18n.locale),
          sceneTitle: scene.title,
        });
        if (matches.length >= MAX_SUGGESTIONS) {
          return matches;
        }
      }
    }
    return matches;
  }, [scenes, value, i18n.locale]);

  const showSuggestions = open && !disabled && suggestions.length > 0;

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        <Trans>Location</Trans>
      </span>
      <div className="relative">
        <input
          type="text"
          className={eventFieldClass()}
          placeholder={t`TBA`}
          value={value}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        {showSuggestions && (
          <ul className="border-base-300 bg-base-100 absolute top-full right-0 left-0 mt-1 max-h-60 overflow-auto rounded-xl border py-1 shadow-md">
            {suggestions.map((suggestion) => (
              <li key={suggestion.key}>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-base-200 flex w-full flex-col px-4 py-2 text-left",
                    suggestion.title === value && "bg-base-200",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(suggestion.title);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{suggestion.displayTitle}</span>
                  <span className="text-base-content/70 text-xs">
                    {suggestion.sceneTitle}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  );
}
