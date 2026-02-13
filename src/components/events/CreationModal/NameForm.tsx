import { $workshops } from "@/api/workshops";
import { queryClient } from "@/app/query-client";
import { useRef, useState } from "react";
import { emptyEvent } from "../utils";
import { useNavigate } from "@tanstack/react-router";
import { $clubs } from "@/api/clubs";
import { HostType, UserRole } from "@/api/workshops/types";
import type { SchemaUser } from "@/api/workshops/types";
import clsx from "clsx";
import type { SchemaUserWithClubs } from "@/api/clubs/types";

export interface NameFormProps {
  onClose?: () => void;
  /** When provided (e.g. from EventsAdminPage), avoids duplicate user fetches. */
  eventsUser?: SchemaUser;
  clubsUser?: SchemaUserWithClubs;
}

export default function NameForm({
  onClose,
  eventsUser: eventsUserProp,
  clubsUser: clubsUserProp,
}: NameFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const redirect = useNavigate();

  const { data: eventsUserData } = $workshops.useQuery("get", "/users/me", {
    enabled: !eventsUserProp,
  });
  const { data: clubsUserData } = $clubs.useQuery("get", "/users/me", {
    enabled: !clubsUserProp,
  });
  const eventsUser = eventsUserProp ?? eventsUserData;
  const clubsUser = clubsUserProp ?? clubsUserData;

  const { mutate: createEvent } = $workshops.useMutation(
    "post",
    "/workshops/",
    {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
      },
      onSuccess: ({ id }) => {
        throw redirect({ to: "/events/$id/edit", params: { id } });
      },
    },
  );

  const handleCreateButton = () => {
    if (!clubsUser || !eventsUser) return;

    const isClubLeader = clubsUser.leader_in_clubs.length > 0;
    const isEventsAdmin = eventsUser.role === UserRole.admin;

    if (!nameRef.current || (!isEventsAdmin && !isClubLeader)) return;

    const title = nameRef.current.value.trim();
    if (!title) {
      setNameError("Title shouldn't be empty");
      return;
    }

    createEvent({
      body: emptyEvent(
        title,
        isClubLeader
          ? [{ type: HostType.club, name: clubsUser.leader_in_clubs[0].id }]
          : [],
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">
          Enter event title: <span className="text-red-500">*</span>
        </legend>
        <input
          className={clsx("input w-full", nameError && "input-error")}
          ref={nameRef}
          onChange={(e) =>
            setNameError(!e.target.value.trim() ? nameError : null)
          }
          type="text"
          maxLength={255}
          placeholder="Event name"
        />
      </fieldset>
      {nameError && (
        <p className="text-sm text-red-500 dark:text-red-400">{nameError}</p>
      )}
      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleCreateButton}>
          Create
        </button>
      </div>
    </div>
  );
}
