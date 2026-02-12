import { ChangeEvent, Fragment, useState } from "react";
import { EventFormErrors } from "../types";
import clsx from "clsx";
import { HostType, WorkshopLanguage } from "@/api/workshops/types";
import TagsSelector from "./TagsSelector";
import { SchemaClub } from "@/api/clubs/types";
import { $clubs } from "@/api/clubs";
import { EventFormState, EventHostSelection } from "../types";

export interface NameDescriptionProps {
  eventForm: EventFormState;
  setEventForm: (v: EventFormState) => void;
  clubs: SchemaClub[];
  /** When provided, avoids duplicate fetch for full club list (from EditPage). */
  clubList?: SchemaClub[];
  isAdmin?: boolean;
  errors: EventFormErrors;
  className?: string;
}

/**
 * Name & Description component for creating event modal
 * @param eventForm
 * @param setEventForm
 * @param errors
 */
export default function NameDescription({
  eventForm,
  setEventForm,
  errors,
  clubs,
  clubList: clubListProp,
  isAdmin = false,
  className,
}: NameDescriptionProps) {
  const hostArray = eventForm.hosts ?? [];
  const hostType = (h: EventHostSelection) =>
    h?.type ?? (h as { host_type?: string }).host_type ?? HostType.other;
  const isClubHost = (h: EventHostSelection) =>
    hostType(h) === HostType.club || String(hostType(h)) === "club";
  const clubHostIds = hostArray.filter(isClubHost).map((h) => h?.name ?? "");

  const [currentTab, setCurrentTab] = useState<string>("english");

  const { data: clubListData } = $clubs.useQuery("get", "/clubs/", {
    enabled: !clubListProp,
  });
  const clubList = clubListProp ?? clubListData;

  const updateHost = (index: number, patch: Partial<EventHostSelection>) => {
    if (index < 0 || index >= eventForm.hosts.length) return;
    setEventForm({
      ...eventForm,
      hosts: eventForm.hosts.with(index, {
        ...eventForm.hosts[index],
        ...patch,
      }),
    });
  };

  const removeHost = (index: number) => {
    setEventForm({
      ...eventForm,
      hosts: eventForm.hosts.filter((_, i) => i !== index),
    });
  };

  const addHost = () => {
    setEventForm({
      ...eventForm,
      hosts: [
        ...eventForm.hosts,
        {
          id: globalThis.crypto.randomUUID() as EventHostSelection["id"],
          type: HostType.club,
          name: "",
        },
      ],
    });
  };

  const updateLanguage = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setEventForm({
      ...eventForm,
      language: value as WorkshopLanguage,
    });
  };

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {/* Language Select */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend text-lg">
          Language of the event: <span className="text-red-500">*</span>
        </legend>
        <select
          value={eventForm.language || ""}
          onChange={updateLanguage}
          className="select w-full"
        >
          <option value="english">English</option>
          <option value="russian">Russian</option>
          <option value="both">Russian & English</option>
        </select>
      </fieldset>
      <div className="divider my-0.5" />
      {/* Name & Description */}
      <div>
        <div role="tablist" className={clsx("tabs tabs-box mb-2 flex-nowrap")}>
          <span
            role="tab"
            onClick={() => setCurrentTab("english")}
            className={clsx(
              "tab w-full",
              currentTab === "english" && "tab-active",
            )}
          >
            English
          </span>
          <span
            role="tab"
            onClick={() => setCurrentTab("russian")}
            className={clsx(
              "tab w-full",
              currentTab === "russian" && "tab-active",
            )}
          >
            Russian
          </span>
        </div>
        {currentTab === "english" ? (
          <TabContent
            nameValue={eventForm.english_name ?? ""}
            nameError={errors.name}
            nameOnChange={(e) =>
              setEventForm({ ...eventForm, english_name: e.target.value })
            }
            descriptionValue={eventForm.english_description ?? ""}
            descriptionOnChange={(e) =>
              setEventForm({
                ...eventForm,
                english_description: e.target.value,
              })
            }
            language="English"
          />
        ) : (
          <TabContent
            nameValue={eventForm.russian_name ?? ""}
            nameError={errors.name}
            nameOnChange={(e) =>
              setEventForm({ ...eventForm, russian_name: e.target.value })
            }
            descriptionValue={eventForm.russian_description ?? ""}
            descriptionOnChange={(e) =>
              setEventForm({
                ...eventForm,
                russian_description: e.target.value,
              })
            }
            language="Russian"
          />
        )}
        <span className="label mt-1.5 text-xs">
          Description supports markdown
        </span>
      </div>
      <div className="divider my-0.5" />
      {/* Host */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend text-lg">
          Host: <span className="text-red-500">*</span>
        </legend>

        {/* Club leader hosts settings */}
        {clubs.length > 0 && !isAdmin && (
          <select
            className="select"
            value={clubHostIds[0] || "Pick a club"}
            onChange={(e) => {
              const clubId = e.target.value;
              setEventForm({
                ...eventForm,
                hosts: clubId
                  ? [
                      {
                        id: globalThis.crypto.randomUUID(),
                        type: HostType.club,
                        name: clubId,
                      },
                    ]
                  : [],
              });
            }}
          >
            <option value="Pick a club" disabled>
              Pick a club
            </option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.title}
              </option>
            ))}
          </select>
        )}

        {/* Admin hosts settings */}
        {isAdmin && (
          <>
            <div className="grid w-full grid-cols-[15%_1fr_auto] items-center gap-2">
              <span className="text-md font-semibold">Is club?</span>
              <span className="text-md col-span-2 font-semibold">
                Host name / Club name
              </span>
              {eventForm.hosts.map((host, index) => {
                const type = hostType(host);
                const isClub =
                  type === HostType.club || String(type) === "club";
                const otherChosenClubIds = eventForm.hosts
                  .filter(
                    (h, j) =>
                      j !== index &&
                      (hostType(h) === HostType.club ||
                        String(hostType(h)) === "club"),
                  )
                  .map((h) => h.name)
                  .filter(Boolean);
                const availableClubs = (clubList ?? []).filter(
                  (c) => !otherChosenClubIds.includes(c.id),
                );
                return (
                  <Fragment
                    key={(host as EventHostSelection).id ?? `host-${index}`}
                  >
                    <select
                      className="select"
                      value={String(type)}
                      onChange={(e) => {
                        const choice =
                          e.target.value === "club"
                            ? HostType.club
                            : HostType.other;
                        updateHost(index, { type: choice, name: "" });
                      }}
                    >
                      <option value="club">Club</option>
                      <option value="other">Other</option>
                    </select>
                    {isClub ? (
                      <select
                        className="select w-full min-w-[120px] flex-1"
                        value={host.name || ""}
                        onChange={(e) =>
                          updateHost(index, { name: e.target.value })
                        }
                      >
                        <option value="">Pick a club</option>
                        {availableClubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className={clsx(
                          "input w-full min-w-[120px] flex-1",
                          errors.host && "input-error",
                        )}
                        placeholder="Host name"
                        value={host.name ?? ""}
                        onChange={(e) =>
                          updateHost(index, { name: e.target.value.trim() })
                        }
                        maxLength={255}
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-square"
                      onClick={() => removeHost(index)}
                      aria-label="Remove host"
                    >
                      ×
                    </button>
                  </Fragment>
                );
              })}
            </div>

            <button
              type="button"
              className="btn btn-sm mt-2 self-start"
              onClick={addHost}
            >
              + Add another host
            </button>
          </>
        )}

        <label
          className={clsx(
            !errors.host ? "label" : "text-sm text-red-500 dark:text-red-400",
          )}
        >
          {!errors.host
            ? "e.g. Club name, Telegram, Full Name..."
            : errors.host}
        </label>
      </fieldset>

      <TagsSelector<EventFormState>
        tagsToExlude={!isAdmin ? ["recommended"] : []}
        lockBadges={!isAdmin ? ["recommended"] : []}
        form={eventForm}
        setForm={setEventForm}
      />
    </div>
  );
}

interface TabContentProps {
  nameValue: string;
  nameError: string | null | undefined;
  nameOnChange: (e: ChangeEvent<HTMLInputElement>) => void;
  descriptionValue: string;
  descriptionOnChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  language: string;
  className?: string;
}

/**
 * Language tab component for creation dialog contains Title & Description
 * @param language String name for placeholders
 */
function TabContent({
  nameValue,
  nameError,
  nameOnChange,
  descriptionValue,
  descriptionOnChange,
  language,
  className,
}: TabContentProps) {
  return (
    <div className={clsx(className)}>
      <fieldset className="fieldset">
        <legend className="fieldset-legend text-lg">
          Title: <span className="text-red-500">*</span>
        </legend>
        <input
          className={clsx("input w-full", nameError && "input-error")}
          value={nameValue}
          onChange={nameOnChange}
          type="text"
          maxLength={255}
          placeholder={`${language} Title`}
        />
      </fieldset>

      {nameError && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
          {nameError}
        </p>
      )}

      <label className="floating-label mt-3">
        <textarea
          className="textarea w-full resize-none"
          value={descriptionValue}
          onChange={descriptionOnChange}
          placeholder={`${language} Description`}
          rows={7}
        />
        <span>{language} Description</span>
      </label>
    </div>
  );
}
