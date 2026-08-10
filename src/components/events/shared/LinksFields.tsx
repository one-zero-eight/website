import { SchemaEventLink } from "@/api/workshops/types";

export type LinkFormValue = {
  url: string;
  name: string;
};

export function linksApiToForm(
  links: SchemaEventLink[] | null | undefined,
): LinkFormValue[] {
  return (links ?? []).map((link) => ({
    url: link.url,
    name: link.name ?? "",
  }));
}

export function linksFormToApi(links: LinkFormValue[]): SchemaEventLink[] {
  return links
    .map((link) => ({
      url: link.url.trim(),
      name: link.name.trim() || null,
    }))
    .filter((link) => link.url.length > 0);
}

export function LinksFields({
  value,
  onChange,
  disabled,
}: {
  value: LinkFormValue[];
  onChange: (value: LinkFormValue[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Links</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm border"
          disabled={disabled}
          onClick={() => onChange([...value, { url: "", name: "" }])}
        >
          Add link
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-base-content/60 text-sm">No links yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {value.map((link, index) => (
            <div
              key={index}
              className="border-base-300 flex flex-col gap-2 rounded-xl border p-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span>URL</span>
                <input
                  type="url"
                  className="input input-bordered w-full"
                  placeholder="https://"
                  disabled={disabled}
                  value={link.url}
                  onChange={(e) =>
                    onChange(
                      value.map((item, i) =>
                        i === index ? { ...item, url: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Name (optional)</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  disabled={disabled}
                  value={link.name}
                  onChange={(e) =>
                    onChange(
                      value.map((item, i) =>
                        i === index ? { ...item, name: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
