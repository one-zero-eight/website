import { DescriptionEditor } from "@/components/editor/DescriptionEditor.tsx";
import type { TiptapEditorRef } from "@/components/editor/_TiptapDescriptionEditor";
import { DescriptionViewer } from "@/components/editor/DescriptionViewer.tsx";
import { cn } from "@/lib/ui/cn";
import { RefObject } from "react";
import {
  parseDescriptionContent,
  type DescriptionDoc,
} from "../utils/description";
import { eventFieldClass } from "./formStyles";

export function LocaleContentSection({
  locales,
  selectedLocale,
  onSelectLocale,
  name,
  description,
  toolbar,
  editing,
  editName,
  onEditNameChange,
  editorRef,
  editorInitialContent,
}: {
  locales: string[];
  selectedLocale: string | null;
  onSelectLocale: (locale: string) => void;
  name?: string | null;
  description?: string | null;
  toolbar?: React.ReactNode;
  editing?: boolean;
  editName?: string;
  onEditNameChange?: (value: string) => void;
  editorRef?: RefObject<TiptapEditorRef | null>;
  editorInitialContent?: DescriptionDoc | null;
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
              selectedLocale === locale
                ? "btn-primary"
                : "btn-ghost border border-dashed",
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
            className={eventFieldClass()}
            placeholder="Event name"
            value={editName ?? ""}
            onChange={(e) => onEditNameChange?.(e.target.value)}
          />
          {/* Border wraps the whole editor (incl. drag handle gutter), not only .tiptap */}
          <div className="border-base-300 bg-base-100 min-h-40 rounded-xl border py-3 pr-3 pl-3 md:pl-10">
            <DescriptionEditor
              key={`${selectedLocale}-${editing}`}
              ref={editorRef}
              className="min-h-32"
              initialContent={editorInitialContent ?? undefined}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-medium wrap-anywhere">
            {name?.trim() || "Untitled event"}
          </h2>
          <DescriptionViewer
            content={parseDescriptionContent(description)}
            className="text-base-content/80"
          />
        </div>
      )}
    </div>
  );
}
