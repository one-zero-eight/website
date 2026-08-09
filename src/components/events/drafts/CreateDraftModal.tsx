import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEventsAuth } from "../hooks";
import {
  HostFields,
  HostFormValue,
  hostApiToForm,
  hostFormToApi,
} from "../shared/HostFields";
import {
  fromDatetimeLocalValue,
  isDatetimeLocalInPast,
} from "../utils/datetime";
import { cn } from "@/lib/ui/cn";

export function CreateDraftModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { clubs, isClubLeader, isEventManager } = useEventsAuth();
  const { data: allowedLocales = [] } = $workshops.useQuery("get", "/locales");

  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLocales, setSelectedLocales] = useState<string[]>([]);
  const [host, setHost] = useState<HostFormValue>({ mode: "none" });

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartsAt("");
    setLocation("");
    setSelectedLocales(allowedLocales.slice(0, 1));
    setHost(
      hostApiToForm(null, {
        canUseClub: isClubLeader,
        canUseExternal: isEventManager,
        defaultClubId: clubs[0]?.club_id,
      }),
    );
  }, [open, allowedLocales, isClubLeader, isEventManager, clubs]);

  const { mutate, isPending } = $workshops.useMutation("post", "/drafts/", {
    onSuccess: (draft) => {
      onOpenChange(false);
      navigate({ to: "/events/drafts/$id", params: { id: draft.id } });
    },
    onError: (error) => {
      showError("Error", formatApiErrorMessage(error));
    },
  });

  function handleSubmit() {
    if (startsAt && isDatetimeLocalInPast(startsAt)) {
      showError("Invalid date", "Start time cannot be in the past.");
      return;
    }

    const apiHost = hostFormToApi(host);

    mutate({
      body: {
        starts_at: startsAt ? fromDatetimeLocalValue(startsAt) : null,
        location: location.trim() || "TBA",
        locales: selectedLocales,
        host: apiHost,
      },
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create draft">
      <div className="@container/modal flex flex-col gap-4">
        <HostFields
          value={host}
          onChange={setHost}
          clubs={clubs}
          canUseClub={isClubLeader}
          canUseExternal={isEventManager}
          disabled={isPending}
        />

        <label className="flex flex-col gap-1 text-sm">
          <span>Starts at</span>
          <input
            type="datetime-local"
            className="input input-bordered w-full"
            value={startsAt}
            disabled={isPending}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Location</span>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="TBA"
            value={location}
            disabled={isPending}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Locales</span>
          <div className="flex flex-wrap gap-2">
            {allowedLocales.map((locale) => {
              const selected = selectedLocales.includes(locale);
              return (
                <button
                  key={locale}
                  type="button"
                  disabled={isPending}
                  className={cn(
                    "btn btn-sm uppercase",
                    selected ? "btn-primary" : "btn-ghost border",
                  )}
                  onClick={() =>
                    setSelectedLocales((prev) =>
                      selected
                        ? prev.filter((item) => item !== locale)
                        : [...prev, locale],
                    )
                  }
                >
                  {locale}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
