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
      { id: eventForm.links.length, title: "", url: "" },
    ];

    setEventForm({
      ...eventForm,
      links: newLinks,
    });
  };

  const removeLink = (id: number) => {
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
      <ul className="list rounded-box gap-2 shadow-md">
        <div className="flex items-center justify-between tracking-wide">
          <h2 className="flex items-center gap-1 text-lg font-semibold">
            <span className="icon-[ic--round-link] size-6"></span>Links
          </h2>
          <button className="btn btn-primary" onClick={addLink}>
            <span className="icon-[fluent--link-add-16-filled] text-xl" />
            Add Link
          </button>
        </div>
        {eventForm.links.map((link, index) => (
          <li
            className="list-row flex flex-col border md:flex-row md:items-center md:border-transparent"
            key={link.id}
          >
            <span className="hidden text-lg font-semibold text-nowrap md:block">
              {index + 1}.
            </span>
            <label className="floating-label">
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
            <label className="floating-label">
              <span>Link Url</span>
              <input
                type="url"
                placeholder="e.g. https://t.me/handle"
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
              className="btn btn-sm btn-square btn-ghost btn-error"
              onClick={() => removeLink(link.id)}
            >
              <span className="icon-[solar--trash-bin-2-bold] text-lg" />
            </button>
          </li>
        ))}
      </ul>
      {errors.links && errors.links.length > 0 && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.links}</p>
      )}
    </div>
  );
}
