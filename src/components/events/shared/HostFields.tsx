import { HostType } from "@/api/workshops/types";
import { cn } from "@/lib/ui/cn";

export type HostFormValue =
  | { mode: "club"; clubId: string }
  | { mode: "external"; name: string; url: string }
  | { mode: "none" };

export function HostFields({
  value,
  onChange,
  clubs,
  canUseClub,
  canUseExternal,
  disabled,
}: {
  value: HostFormValue;
  onChange: (value: HostFormValue) => void;
  clubs: { club_id: string; title: string }[];
  canUseClub: boolean;
  canUseExternal: boolean;
  disabled?: boolean;
}) {
  const showModeToggle = canUseClub && canUseExternal;

  return (
    <div className="flex flex-col gap-3">
      {showModeToggle && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "btn btn-sm",
              value.mode === "club" ? "btn-primary" : "btn-ghost border",
            )}
            disabled={disabled}
            onClick={() =>
              onChange({
                mode: "club",
                clubId: clubs[0]?.club_id ?? "",
              })
            }
          >
            Club
          </button>
          <button
            type="button"
            className={cn(
              "btn btn-sm",
              value.mode === "external" ? "btn-primary" : "btn-ghost border",
            )}
            disabled={disabled}
            onClick={() => onChange({ mode: "external", name: "", url: "" })}
          >
            External
          </button>
        </div>
      )}

      {(value.mode === "club" || (!showModeToggle && canUseClub)) &&
        canUseClub && (
          <label className="flex flex-col gap-1 text-sm">
            <span>Host club</span>
            <select
              className="select select-bordered w-full"
              disabled={disabled || clubs.length === 0}
              value={value.mode === "club" ? value.clubId : ""}
              onChange={(e) =>
                onChange({ mode: "club", clubId: e.target.value })
              }
            >
              <option value="" disabled>
                Select a club
              </option>
              {clubs.map((club) => (
                <option key={club.club_id} value={club.club_id}>
                  {club.title}
                </option>
              ))}
            </select>
          </label>
        )}

      {(value.mode === "external" || (!showModeToggle && canUseExternal)) &&
        canUseExternal && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span>Host name</span>
              <input
                type="text"
                className="input input-bordered w-full"
                disabled={disabled}
                value={value.mode === "external" ? value.name : ""}
                onChange={(e) =>
                  onChange({
                    mode: "external",
                    name: e.target.value,
                    url: value.mode === "external" ? value.url : "",
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Host URL (optional)</span>
              <input
                type="url"
                className="input input-bordered w-full"
                disabled={disabled}
                value={value.mode === "external" ? value.url : ""}
                onChange={(e) =>
                  onChange({
                    mode: "external",
                    name: value.mode === "external" ? value.name : "",
                    url: e.target.value,
                  })
                }
              />
            </label>
          </>
        )}

      {!canUseClub && !canUseExternal && (
        <p className="text-base-content/70 text-sm">
          You cannot set a host with your current roles.
        </p>
      )}
    </div>
  );
}

export function hostFormToApi(value: HostFormValue) {
  if (value.mode === "club" && value.clubId) {
    return { type: HostType.club, club_id: value.clubId };
  }

  if (value.mode === "external" && value.name.trim()) {
    return {
      type: HostType.external,
      name: value.name.trim(),
      url: value.url.trim() || null,
    };
  }

  return null;
}

export function hostApiToForm(
  host:
    | {
        type: HostType;
        club_id?: string | null;
        name?: string | null;
        url?: string | null;
      }
    | null
    | undefined,
  options: {
    canUseClub: boolean;
    canUseExternal: boolean;
    defaultClubId?: string;
  },
): HostFormValue {
  if (host?.type === HostType.club && host.club_id) {
    return { mode: "club", clubId: host.club_id };
  }

  if (host?.type === HostType.external) {
    return {
      mode: "external",
      name: host.name ?? "",
      url: host.url ?? "",
    };
  }

  if (options.canUseClub) {
    return { mode: "club", clubId: options.defaultClubId ?? "" };
  }

  if (options.canUseExternal) {
    return { mode: "external", name: "", url: "" };
  }

  return { mode: "none" };
}
