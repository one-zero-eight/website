import { cn } from "@/lib/ui/cn";

export function LocaleContentSection({
  locales,
  selectedLocale,
  onSelectLocale,
  name,
  description,
  toolbar,
  editing,
  editName,
  editDescription,
  onEditNameChange,
  onEditDescriptionChange,
}: {
  locales: string[];
  selectedLocale: string | null;
  onSelectLocale: (locale: string) => void;
  name?: string | null;
  description?: string | null;
  toolbar?: React.ReactNode;
  editing?: boolean;
  editName?: string;
  editDescription?: string;
  onEditNameChange?: (value: string) => void;
  onEditDescriptionChange?: (value: string) => void;
}) {
  return (
    <div className="border-base-300 rounded-2xl border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            className={cn(
              "btn btn-sm uppercase",
              selectedLocale === locale ? "btn-primary" : "btn-ghost border",
            )}
            onClick={() => onSelectLocale(locale)}
            disabled={editing && selectedLocale !== locale}
          >
            {locale}
          </button>
        ))}
        {toolbar}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Event name"
            value={editName ?? ""}
            onChange={(e) => onEditNameChange?.(e.target.value)}
          />
          <textarea
            className="textarea textarea-bordered min-h-40 w-full"
            placeholder="Event description"
            value={editDescription ?? ""}
            onChange={(e) => onEditDescriptionChange?.(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-medium wrap-anywhere">
            {name?.trim() || "Untitled event"}
          </h2>
          <p className="text-base-content/80 wrap-anywhere whitespace-pre-wrap">
            {description?.trim() || "No description yet."}
          </p>
        </div>
      )}
    </div>
  );
}
