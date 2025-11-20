import { $workshops } from "@/api/workshops";
import { queryClient } from "@/app/query-client";
import { useRef } from "react";
import { emptyEvent } from "../event-utils";
import { useNavigate } from "@tanstack/react-router";

export interface NameFormProps {
  onClose?: () => void;
}

export default function NameForm({ onClose }: NameFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const redirect = useNavigate();

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
        throw redirect({ to: "/events/$id", params: { id } });
      },
    },
  );

  const handleCreateButton = () => {
    if (!nameRef.current) return;
    const title = nameRef.current.value.trim();
    if (!title) {
      console.error("Title shouldn't be empty");
      return;
    }

    createEvent({ body: emptyEvent(title) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="font-semibold">Enter event title:</span>
        <input
          type="text"
          ref={nameRef}
          className="input w-full"
          placeholder="Event name"
        />
      </div>
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
