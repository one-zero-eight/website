import type { UUID } from "crypto";
import { EventFormErrors, EventFormState, EventLink } from "../types";

export interface AdditionalInfoProps {
  eventForm: EventFormState;
  setEventForm: (v: EventFormState) => void;
  errors: EventFormErrors;
  className?: string;
}

export default function AdditionalInfo({
  eventForm,
  setEventForm,
  errors,
  className,
}: AdditionalInfoProps) {
  const addLink = () => {
    const newLinks: EventLink[] = [
      ...(eventForm.links as EventLink[]),
      { id: globalThis.crypto.randomUUID(), title: "", url: "" },
    ];

    setEventForm({
      ...eventForm,
      links: newLinks,
    });
  };

  const removeLink = (id: UUID) => {
    const newLinks: EventLink[] = [
      ...(eventForm.links as EventLink[]).filter((t) => t.id !== id),
    ];

    setEventForm({
      ...eventForm,
      links: newLinks,
    });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between tracking-wide">
        <h2 className="flex items-center gap-1 text-lg font-semibold">
          <span className="icon-[ic--round-link] size-6"></span>Links
        </h2>
        <button className="btn btn-primary" onClick={addLink}>
          <span className="icon-[fluent--link-add-16-filled] text-xl" />
          Add Link
        </button>
      </div>
      <ul className="rounded-box mt-3 flex flex-col gap-3 shadow-md">
        {eventForm.links.map((link, index) => (
          <li
            className="border-base-300 flex flex-col gap-3 border-b-2 pb-3 md:flex-row md:items-center"
            key={link.id}
          >
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-nowrap">
                {index + 1}.
              </span>
              <label className="floating-label w-full">
                <span>Link Label</span>
                <input
                  type="text"
                  placeholder="e.g. Chat, Form"
                  className="input input-md w-full"
                  value={link.title}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      links: eventForm.links.with(index, {
                        ...link,
                        title: e.target.value,
                      }),
                    })
                  }
                />
              </label>
            </div>
            <div className="flex items-center gap-4 md:w-full">
              <label className="floating-label w-full">
                <span>Link Url</span>
                <input
                  type="url"
                  placeholder="e.g. https://example.com or @tg_handle"
                  className="input input-md w-full"
                  value={link.url}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      links: eventForm.links.with(index, {
                        ...link,
                        url: e.target.value,
                      }),
                    })
                  }
                />
              </label>
              <button
                className="btn btn-sm btn-square dark:btn-soft btn-error size-10"
                onClick={() => removeLink(link.id)}
              >
                <span className="icon-[solar--trash-bin-2-bold] text-xl" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {errors.links && errors.links.length > 0 && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.links}</p>
      )}
    </div>
  );
}
