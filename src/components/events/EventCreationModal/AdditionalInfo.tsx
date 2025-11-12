import { EventFormErrors, EventFormState } from "./CreationForm";

export interface AdditionalInfoProps {
  eventForm: EventFormState;
  setEventForm: (v: EventFormState) => void;
  errors: EventFormErrors;
}

export default function AdditionalInfo({
  eventForm,
  setEventForm,
  errors,
}: AdditionalInfoProps) {
  const addLink = () => {
    setEventForm({
      ...eventForm,
      links: [
        ...eventForm.links,
        { id: eventForm.links.length - 1, title: "", url: "" },
      ],
    });
  };

  const removeLink = (id: number) => {
    setEventForm({
      ...eventForm,
      links: eventForm.links.filter((link) => link.id !== id),
    });
  };

  return (
    <div>
      <ul className="list rounded-box gap-2 shadow-md">
        <div className="flex items-center justify-between p-2 pb-1 tracking-wide">
          <h2 className="flex items-center gap-1 text-lg font-semibold">
            Links
            <span className="text-neutral-400">(optional)</span>:
          </h2>
          <button className="btn btn-outline border" onClick={addLink}>
            <span className="icon-[fluent--link-add-16-filled] text-xl" />
            Add Link
          </button>
        </div>
        {eventForm.links.map((link, index) => (
          <li
            className="list-row flex flex-col border md:flex-row md:items-center md:border-transparent"
            key={index}
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
                value={eventForm.links[eventForm.links.indexOf(link)].title}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    links: eventForm.links.with(eventForm.links.indexOf(link), {
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
                value={eventForm.links[eventForm.links.indexOf(link)].url}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    links: eventForm.links.with(eventForm.links.indexOf(link), {
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
