import { $accounts } from "@/api/accounts";
import { navigateToSignOut } from "@/api/accounts/sign-in.tsx";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type { scheduleTypes } from "@/api/schedule";
import TelegramLoginButton from "@/components/account/TelegramLoginButton.tsx";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import { getDormScheduleAliases } from "@/components/onboarding/dorm-schedule.ts";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

export function SignInStep({
  name,
  email,
  onContinue,
}: {
  name?: string | null;
  email?: string | null;
  onContinue: () => void;
}) {
  const isSignedIn = !!email;

  return (
    <StepContent title="Sign in via Innopolis SSO">
      {isSignedIn ? (
        <>
          <StepBody>
            <div className="flex flex-col overflow-hidden text-center">
              <p className="text-xl wrap-break-word">{name}</p>
              <p className="text-base-content/75 truncate">{email}</p>
            </div>
            <button
              type="button"
              className="link text-base-content/60 hover:text-base-content self-center text-sm"
              onClick={() => navigateToSignOut("/start?step=1")}
            >
              Not you? Sign out
            </button>
          </StepBody>
          <PrimaryButton onClick={onContinue}>Confirm</PrimaryButton>
        </>
      ) : (
        <StepBody>
          <p className="text-base-content/75 text-center">
            Use your Innopolis account
            <br />
            to access InNoHassle services.
          </p>
          <div className="flex justify-center">
            <SignInButton />
          </div>
        </StepBody>
      )}
    </StepContent>
  );
}

export function TelegramStep({
  telegramName,
  telegramUsername,
  requiresReconnect,
  onContinue,
}: {
  telegramName?: string | null;
  telegramUsername?: string | null;
  requiresReconnect: boolean;
  onContinue: () => void;
}) {
  const queryClient = useQueryClient();
  const [forceReconnect, setForceReconnect] = useState(false);
  const {
    mutate: connectTelegram,
    isPending,
    isError,
    error,
  } = $accounts.useMutation("post", "/providers/telegram/connect", {
    onSuccess: () => {
      setForceReconnect(false);
      queryClient.invalidateQueries({
        queryKey: $accounts.queryOptions("get", "/users/me").queryKey,
      });
    },
  });

  if (telegramUsername && !requiresReconnect && !forceReconnect) {
    return (
      <StepContent title="Connect Telegram">
        <StepBody>
          <div className="text-center">
            {telegramName && <p className="text-xl">{telegramName}</p>}
            <p className="text-base-content/75">@{telegramUsername}</p>
          </div>
          <button
            type="button"
            className="link text-base-content/60 hover:text-base-content self-center text-sm"
            onClick={() => setForceReconnect(true)}
          >
            Wrong? Reconnect
          </button>
        </StepBody>
        <PrimaryButton onClick={onContinue}>Confirm</PrimaryButton>
      </StepContent>
    );
  }

  return (
    <StepContent
      title={
        requiresReconnect || forceReconnect
          ? "Reconnect Telegram"
          : "Connect Telegram"
      }
    >
      <StepBody>
        <div className="text-base-content/60 flex flex-col font-light">
          <div className="flex px-3 py-2">
            <span className="icon-[mdi--tick-outline] mr-2 shrink-0 text-xl text-green-500" />
            Allow InNoHassle to message you on Telegram.
          </div>
          <div className="flex px-3 py-2">
            <span className="icon-[mdi--close-outline] mr-2 shrink-0 text-xl text-red-500" />
            Do not block the bot.
          </div>
        </div>

        {isError && (
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(error)}</span>
          </div>
        )}

        {isPending ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : (
          <TelegramLoginButton
            botName={import.meta.env.VITE_BOT_NAME!}
            onAuth={(telegramUser) => connectTelegram({ body: telegramUser })}
            className="flex min-h-10 w-full items-center justify-center overflow-hidden"
          />
        )}
      </StepBody>
    </StepContent>
  );
}

export function DormScheduleStep({
  building,
  floor,
  onBuildingChange,
  onFloorChange,
  eventGroups,
  isEventGroupsPending,
  isEventGroupsError,
  eventGroupsError,
  isSaving,
  saveError,
  onContinue,
}: {
  building: string;
  floor: string;
  onBuildingChange: (building: string) => void;
  onFloorChange: (floor: string) => void;
  eventGroups?: scheduleTypes.SchemaListEventGroupsResponse;
  isEventGroupsPending: boolean;
  isEventGroupsError: boolean;
  eventGroupsError: unknown;
  isSaving: boolean;
  saveError: string | null;
  onContinue: ({
    aliases,
    building,
    floor,
  }: {
    aliases: string[];
    building: string;
    floor: string;
  }) => void;
}) {
  const matchedAliases = getDormScheduleAliases({ building, floor });
  const isSelectionComplete = matchedAliases.length > 0;
  const matchedGroups = matchedAliases.flatMap((alias) => {
    const group = eventGroups?.event_groups.find(
      (eventGroup) => eventGroup.alias === alias,
    );
    return group ? [group] : [];
  });

  return (
    <StepContent title="Find your dorm schedule">
      <StepBody>
        <DormBuildingFloorInput
          building={building}
          floor={floor}
          onBuildingChange={onBuildingChange}
          onFloorChange={onFloorChange}
        />

        {isSelectionComplete && isEventGroupsPending && (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        )}

        {isSelectionComplete && isEventGroupsError && (
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(eventGroupsError)}</span>
          </div>
        )}

        {isSelectionComplete &&
          !isEventGroupsPending &&
          !isEventGroupsError &&
          matchedGroups.length > 0 && (
            <>
              <div className="flex flex-col gap-0.5">
                {matchedGroups.map((group) => (
                  <div
                    key={group.alias}
                    className="bg-base-200 rounded-box px-3 py-2 text-center text-sm"
                  >
                    {group.name}
                  </div>
                ))}
              </div>
              <p className="text-base-content/70 text-center text-sm">
                You will see room cleaning and linen change schedules in your
                personal calendar.
              </p>
            </>
          )}

        {saveError && (
          <div className="alert alert-error">
            <span>{saveError}</span>
          </div>
        )}
      </StepBody>

      <PrimaryButton
        onClick={() =>
          onContinue({
            aliases: matchedAliases,
            building,
            floor,
          })
        }
        disabled={
          !isSelectionComplete ||
          isEventGroupsPending ||
          isEventGroupsError ||
          matchedGroups.length !== matchedAliases.length ||
          isSaving
        }
      >
        {isSaving ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Confirm"
        )}
      </PrimaryButton>
    </StepContent>
  );
}

export function VerifyGroupsStep({
  groups,
  isPending,
  isError,
  error,
  onContinue,
}: {
  groups: Array<{
    alias: string;
    name: string | null | undefined;
    types: string[];
  }>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onContinue: () => void;
}) {
  return (
    <StepContent title="Verify your groups">
      <StepBody>
        {isPending && (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        )}

        {isError && (
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(error)}</span>
          </div>
        )}

        {!isPending && !isError && (
          <div className="flex flex-col gap-2">
            {groups.length > 0 ? (
              groups.map((group) => (
                <div
                  key={group.alias}
                  className="bg-base-200 rounded-box px-4 py-3 text-center"
                >
                  {group.name}
                  {group.types.length > 0 && ` (${group.types.join(", ")})`}
                </div>
              ))
            ) : (
              <p className="text-base-content/60 text-center text-sm">
                No groups found.
              </p>
            )}
          </div>
        )}

        <p className="text-base-content/60 text-center text-sm">
          {groups.length > 0 ? "Not your groups? " : null}
          <Link
            to="/schedule"
            className="link text-base-content/60 hover:text-base-content"
          >
            {groups.length > 0
              ? "Change them in schedule"
              : "Choose groups in schedule"}
          </Link>
          .
        </p>
      </StepBody>

      <PrimaryButton onClick={onContinue} disabled={isPending || isError}>
        Confirm
      </PrimaryButton>
    </StepContent>
  );
}

export function CompleteStep() {
  return (
    <StepContent title="You are all set">
      <StepBody>
        <Link to="/calendar" className="btn btn-primary w-full">
          Go to personal calendar
          <span className="icon-[material-symbols--arrow-forward]" />
        </Link>
        <Link to="/dashboard" className="btn btn-ghost w-full">
          Go to your dashboard
          <span className="icon-[material-symbols--arrow-forward]" />
        </Link>
        <Link to="/about" className="btn btn-ghost w-full">
          More about InNoHassle
          <span className="icon-[material-symbols--arrow-forward]" />
        </Link>
      </StepBody>
    </StepContent>
  );
}

function DormBuildingFloorInput({
  building,
  floor,
  onBuildingChange,
  onFloorChange,
}: {
  building: string;
  floor: string;
  onBuildingChange: (building: string) => void;
  onFloorChange: (floor: string) => void;
}) {
  const floorInputRef = useRef<HTMLInputElement>(null);
  const isHighRiseBuilding = building === "6" || building === "7";

  function handleBuildingChange(value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!/^[1-7]?$/.test(digit)) return;
    onBuildingChange(digit);
    onFloorChange("");
    if (digit) floorInputRef.current?.focus();
  }

  function handleFloorChange(value: string) {
    const maxLength = isHighRiseBuilding ? 2 : 1;
    onFloorChange(value.replace(/\D/g, "").slice(0, maxLength));
  }

  return (
    <div className="flex items-start justify-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={building}
          onChange={(event) => handleBuildingChange(event.target.value)}
          className="input input-bordered border-primary h-14 w-11 p-0 text-center text-2xl font-medium"
        />
        <span className="text-base-content/50 text-xs">Building</span>
      </div>

      <span className="text-base-content/50 flex h-14 items-center text-2xl">
        −
      </span>

      <div className="flex flex-col items-center gap-2">
        <input
          ref={floorInputRef}
          type="text"
          inputMode="numeric"
          value={floor}
          onChange={(event) => handleFloorChange(event.target.value)}
          className={cn(
            "input input-bordered h-14 p-0 text-center text-2xl font-medium",
            isHighRiseBuilding ? "w-16" : "w-11",
          )}
        />
        <span className="text-base-content/50 text-xs">Floor</span>
      </div>
    </div>
  );
}

function StepContent({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex grow flex-col">
      <h2 className="text-center text-2xl font-medium wrap-break-word">
        {title}
      </h2>
      <div className="flex grow flex-col">{children}</div>
    </div>
  );
}

function StepBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex grow flex-col justify-center gap-4 py-4">
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("btn btn-primary w-full", className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
