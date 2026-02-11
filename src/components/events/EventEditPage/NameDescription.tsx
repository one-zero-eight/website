import { ChangeEvent, useEffect, useRef, useState } from "react";
import { EventFormErrors } from "../types";
import clsx from "clsx";
import { HostType, WorkshopLanguage } from "@/api/workshops/types";
import TagsSelector from "./TagsSelector";
import { SchemaClub } from "@/api/clubs/types";
import { $clubs } from "@/api/clubs";
import { EventFormState } from "../types";

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
  const hostArray = eventForm.host ?? [];
  const isClub = (h: (typeof hostArray)[0]) =>
    h?.host_type === HostType.club || String(h?.host_type) === "club";
  const clubHostIds = hostArray.filter(isClub).map((h) => h?.name ?? "");

  const [currentTab, setCurrentTab] = useState<string>("english");
  const [isClubSelect, setIsClubSelect] = useState<boolean>(
    () => clubHostIds.length > 0,
  );
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>(() =>
    clubHostIds.length > 0 ? clubHostIds : [""],
  );
  const prevHostRef = useRef(eventForm.host ?? []);
  const isInternalUpdateRef = useRef(false);

  const { data: clubListData } = $clubs.useQuery("get", "/clubs/", {
    enabled: !clubListProp,
  });
  const clubList = clubListProp ?? clubListData;

  useEffect(() => {
    const host = eventForm.host ?? [];
    if (
      isClubSelect &&
      !isInternalUpdateRef.current &&
      prevHostRef.current !== host
    ) {
      const ids = host
        .filter(
          (h) =>
            h?.host_type === HostType.club || String(h?.host_type) === "club",
        )
        .map((h) => h?.name ?? "");
      setSelectedClubIds(ids.length > 0 ? ids : [""]);
    }
    prevHostRef.current = host;
    isInternalUpdateRef.current = false;
  }, [eventForm.host, isClubSelect]);

  const updateClubHost = (newIds: string[]) => {
    setSelectedClubIds(newIds);
    const host: EventFormState["host"] = newIds
      .filter((id) => id)
      .map((id) => ({ host_type: HostType.club, name: id }));
    isInternalUpdateRef.current = true;
    setEventForm({ ...eventForm, host });
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
            value={clubHostIds[0] || "Pick a club"}
            onChange={(e) => {
              const clubId = e.target.value;
              setEventForm({
                ...eventForm,
                host: clubId
                  ? [{ host_type: HostType.club, name: clubId }]
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
        {isAdmin === true && (
          <div className="flex flex-col gap-2">
            <label className="label">
              <input
                type="checkbox"
                checked={isClubSelect}
                onChange={(e) => {
                  setIsClubSelect(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedClubIds([]);
                  } else {
                    const ids = hostArray
                      .filter(isClub)
                      .map((h) => h?.name ?? "");
                    setSelectedClubIds(ids.length > 0 ? ids : [""]);
                  }
                }}
                className="toggle"
              />
              Select from clubs
            </label>
            {isClubSelect ? (
              <div className="flex flex-col gap-2">
                {selectedClubIds.map((clubId, index) => {
                  const alreadySelected = selectedClubIds.filter(Boolean);
                  const availableClubs = clubList?.filter(
                    (club) =>
                      !alreadySelected.includes(club.id) || club.id === clubId,
                  );
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        className="select flex-1"
                        value={clubId || "Pick a club"}
                        onChange={(e) => {
                          const newIds = [...selectedClubIds];
                          newIds[index] = e.target.value;
                          updateClubHost(newIds);
                        }}
                      >
                        <option value="Pick a club" disabled>
                          Pick a club
                        </option>
                        {availableClubs?.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.title}
                          </option>
                        ))}
                      </select>
                      {selectedClubIds.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-square"
                          onClick={() => {
                            const newIds = selectedClubIds.filter(
                              (_, i) => i !== index,
                            );
                            updateClubHost(newIds.length > 0 ? newIds : [""]);
                          }}
                          aria-label="Remove club"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-sm self-start"
                  onClick={() => {
                    updateClubHost([...selectedClubIds, ""]);
                  }}
                >
                  + Add another club
                </button>
              </div>
            ) : (
              <input
                type="text"
                className={clsx("input w-full", errors.host && "input-error")}
                placeholder="Host"
                value={
                  hostArray.find(
                    (h) =>
                      h?.host_type === HostType.other ||
                      String(h?.host_type) === "other",
                  )?.name ?? ""
                }
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setEventForm({
                    ...eventForm,
                    host: value
                      ? [{ host_type: HostType.other, name: value }]
                      : [],
                  });
                }}
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
