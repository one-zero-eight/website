import createFetchClient from "@/api/helpers/create-fetch-client";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

const ENCODED_SLOPIK_KEY =
  "aHR0cHM6Ly9hcGkuaW5ub2hhc3NsZS5ydS8xL3NlY3JldC04ZDNlNGIK";
const slopikFetch = createFetchClient<any>();

export type RoomBookingQuestOutcome = "success" | "failure";

function RoomBookingQuestDialogue({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="bg-base-300/95 fixed inset-0 z-30 cursor-pointer overflow-hidden border-0 p-0 text-left"
      onClick={onClick}
    >
      <span className="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center gap-3 p-4 @md/content:gap-5">
        <img
          src={`${import.meta.env.VITE_MINIO_URL}/bootcamp/slopik-the-cat.webp`}
          alt="Slopik the cat"
          className="max-h-[45vh] min-h-0 max-w-full shrink object-contain @md/content:max-h-[55vh]"
          draggable={false}
        />
        <span className="border-primary bg-base-100 text-base-content block w-full shrink-0 rounded-sm border px-4 py-3 text-base shadow-xl @md/content:px-6 @md/content:py-4 @md/content:text-lg">
          {children}
        </span>
      </span>
    </button>
  );
}

export function RoomBookingQuestSecret({
  outcome,
  onFailureDismiss,
}: {
  outcome: RoomBookingQuestOutcome | undefined;
  onFailureDismiss: () => void;
}) {
  const [secretVisible, setSecretVisible] = useState(false);
  const secretQueryEnabled = outcome === "success" && secretVisible;

  const {
    data: secretKey,
    isPending: secretKeyPending,
    isError: secretKeyError,
  } = useQuery({
    queryKey: ["room-booking", "slopik-secret-key", ENCODED_SLOPIK_KEY],
    queryFn: async ({ signal }) => {
      const { data, error } = await slopikFetch.GET(
        atob(ENCODED_SLOPIK_KEY).trim(),
        {
          parseAs: "text",
          signal,
        },
      );

      if (error || !data) {
        throw new Error("Failed to get the secret key.");
      }

      return atob(data.trim()).trim();
    },
    enabled: secretQueryEnabled,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  if (!outcome) return null;

  if (outcome === "failure") {
    return (
      <RoomBookingQuestDialogue onClick={onFailureDismiss}>
        <span className="block">Привет, я Слопик!</span>
        <span className="mt-3 block">
          У меня есть какая-то очень важная бумажечка, но мне сказали никому её
          не показывать. Совсем никому!
        </span>
      </RoomBookingQuestDialogue>
    );
  }

  if (!secretVisible) {
    return (
      <RoomBookingQuestDialogue onClick={() => setSecretVisible(true)}>
        <span className="block">
          Привет, я Слопик! Мне дали какую-то важную бумажечку и сказали никому
          её не показывать. Прям совсем-совсем никому.
        </span>
        <span className="mt-3 block">
          Хотя знаешь, ты так хорошо играешь в прятки, что тебе не жалко. Держи!
        </span>
      </RoomBookingQuestDialogue>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="border-primary bg-base-100 text-primary flex max-w-full items-center justify-center rounded-sm border px-6 py-4 font-mono text-2xl font-bold shadow-xl">
        {secretKeyPending ? (
          <span className="loading loading-spinner loading-md" />
        ) : secretKeyError ? (
          <span className="text-error text-base">
            Failed to get secret key.
          </span>
        ) : (
          <span className="text-center break-all">{secretKey}</span>
        )}
      </div>
    </div>
  );
}
