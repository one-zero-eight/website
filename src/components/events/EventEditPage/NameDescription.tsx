import { ChangeEvent, useState } from "react";
import { EventFormErrors } from "./CreationForm";
import clsx from "clsx";
import { WorkshopLanguage } from "@/api/workshops/types";
import TagsSelector from "./TagsSelector";
import { EventFormState } from "../event-utils";
import { SchemaClub } from "@/api/clubs/types";
import { $clubs } from "@/api/clubs";

export interface NameDescriptionProps {
  eventForm: EventFormState;
  setEventForm: (v: EventFormState) => void;
  clubs: SchemaClub[];
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
  isAdmin = false,
  className,
}: NameDescriptionProps) {
  const [currentTab, setCurrentTab] = useState<string>("english");
  const [isClubSelect, setIsClubSelect] = useState<boolean>(
    !!eventForm.host?.includes("club:"),
  );

  const { data: clubList } = $clubs.useQuery("get", "/clubs/");

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
        <legend className="fieldset-legend">
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
        <legend className="fieldset-legend">
          Host: <span className="text-red-500">*</span>
        </legend>
        {clubs.length > 0 && !isAdmin && (
          <select
            className="select"
            value={eventForm.host?.split(":")[1] || "Pick a club"}
            onChange={(e) => {
              const clubHost = `club:${e.target.value}`;
              setEventForm({ ...eventForm, host: clubHost });
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
        {isAdmin && (
          <div className="flex flex-col gap-2">
            <label className="label">
              <input
                type="checkbox"
                checked={isClubSelect}
                onChange={(e) => setIsClubSelect(e.target.checked)}
                className="toggle"
              />
              Select from clubs
            </label>
            {isClubSelect ? (
              <select
                className="select w-full"
                value={eventForm.host?.split(":")[1] || "Pick a club"}
                onChange={(e) => {
                  const clubHost = `club:${e.target.value}`;
                  setEventForm({ ...eventForm, host: clubHost });
                }}
              >
                <option value="Pick a club" disabled>
                  Pick a club
                </option>
                {clubList?.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className={clsx("input w-full", errors.host && "input-error")}
                placeholder="Host"
                value={eventForm.host === "None" ? "" : eventForm.host || ""}
                onChange={(e) =>
                  setEventForm({ ...eventForm, host: e.target.value })
                }
                maxLength={255}
              />
            )}
          </div>
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
        <legend className="fieldset-legend">
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
