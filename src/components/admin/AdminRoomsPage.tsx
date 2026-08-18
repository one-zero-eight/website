import { $accounts } from "@/api/accounts";
import { $roomBooking } from "@/api/room-booking";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export function AdminRoomsPage({ initialCode }: { initialCode?: string }) {
  const { showError, showSuccess } = useToast();
  const [code, setCode] = useState(initialCode ?? "");
  const [roomSearch, setRoomSearch] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [lastApproval, setLastApproval] = useState<{
    roomId: string;
    at: string;
  } | null>(null);

  const {
    data: rooms,
    isPending: isRoomsPending,
    isError: isRoomsError,
    error: roomsError,
    refetch: refetchRooms,
  } = $roomBooking.useQuery("get", "/rooms/", {
    params: {
      query: {
        include_red: true,
      },
    },
  });

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    const query = roomSearch.trim().toLowerCase();
    if (!query) return rooms;

    return rooms.filter(
      (room) =>
        room.id.toLowerCase().includes(query) ||
        room.title.toLowerCase().includes(query) ||
        room.short_name.toLowerCase().includes(query),
    );
  }, [rooms, roomSearch]);

  const selectedRoom = rooms?.find((room) => room.id === selectedRoomId);

  const { mutate, isPending: isApproving } = $accounts.useMutation(
    "post",
    "/rooms/approve-device-flow",
    {
      onSuccess: (data) => {
        if (!data.room_id) {
          showError("Error", "Device flow was approved without a room id.");
          return;
        }

        setLastApproval({
          roomId: data.room_id,
          at: data.at,
        });
        showSuccess("Success", `TV linked to ${data.room_id}`);
        setCode("");
        setSelectedRoomId(null);
        setRoomSearch("");
      },
      onError: (error) => {
        showError("Error", formatApiErrorMessage(error));
      },
    },
  );

  function handleApprove() {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      showError("Error", "Enter the code from the TV screen.");
      return;
    }

    if (!selectedRoomId) {
      showError("Error", "Select a room.");
      return;
    }

    mutate({
      params: {
        query: {
          code: trimmedCode,
          room_id: selectedRoomId,
        },
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Link TV to room</h2>
        <p className="text-base-content/75 text-sm">
          Open{" "}
          <Link to="/tv" className="link text-primary">
            /tv
          </Link>{" "}
          on the display, enter the startup password below, and approve it for
          the selected room.
        </p>

        <label className="flex flex-col gap-2">
          <span className="font-medium">Startup password</span>
          <input
            autoComplete="off"
            spellCheck={false}
            className="input input-bordered w-full font-mono tracking-[0.2em]"
            placeholder="Code from TV"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="font-medium">Room</span>
          <input
            autoComplete="off"
            spellCheck={false}
            className="input input-bordered w-full"
            placeholder="Search by name or id..."
            value={roomSearch}
            onChange={(event) => setRoomSearch(event.target.value)}
          />
        </label>

        {isRoomsPending && (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        )}

        {isRoomsError && (
          <div className="flex flex-col gap-2">
            <div className="alert alert-error">
              <span>{formatApiErrorMessage(roomsError)}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => refetchRooms()}
            >
              Retry
            </button>
          </div>
        )}

        {!isRoomsPending && !isRoomsError && filteredRooms.length === 0 && (
          <p className="text-base-content/75 text-sm">No rooms found.</p>
        )}

        {!isRoomsPending && !isRoomsError && filteredRooms.length > 0 && (
          <ul className="divide-base-300 border-base-300 max-h-80 divide-y overflow-y-auto rounded-xl border">
            {filteredRooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-base-200 flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors",
                    selectedRoomId === room.id && "bg-base-200",
                  )}
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <span className="font-medium">{room.title}</span>
                  {room.short_name !== room.title && (
                    <span className="text-base-content/75 text-sm">
                      {room.short_name}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedRoom && (
          <p className="text-base-content/75 text-sm">
            Selected: {selectedRoom.title} ({selectedRoom.id})
          </p>
        )}
      </section>

      <button
        type="button"
        className="btn btn-primary"
        disabled={isApproving || !code.trim() || !selectedRoomId}
        onClick={handleApprove}
      >
        {isApproving ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Approve device flow"
        )}
      </button>

      {lastApproval && (
        <div className="alert alert-success">
          <span>
            TV approved for room{" "}
            <Link
              to="/room-booking/rooms/$room"
              params={{ room: lastApproval.roomId }}
              className="link font-medium"
            >
              {lastApproval.roomId}
            </Link>{" "}
            at{" "}
            {new Date(lastApproval.at).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
