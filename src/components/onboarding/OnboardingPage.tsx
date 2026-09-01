import { $accounts } from "@/api/accounts";
import { useMe } from "@/api/accounts/user.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $schedule } from "@/api/schedule";
import {
  getAllTagsByType,
  getFirstTagByType,
} from "@/api/schedule/event-group.ts";
import { TelegramUser } from "@/components/account/TelegramLoginButton.tsx";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress.tsx";
import {
  CompleteStep,
  DormScheduleStep,
  SignInStep,
  TelegramStep,
  VerifyGroupsStep,
} from "@/components/onboarding/OnboardingSteps.tsx";
import { viewConfig } from "@/components/schedule/view-config.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

export function OnboardingPage({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  const { me } = useMe();
  const requiresTelegramReconnect =
    !!me?.telegram_update_data && !me.telegram_update_data.success;
  const isTelegramConnected = !!me?.telegram_info && !requiresTelegramReconnect;

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { searchStr } = useLocation({
    select: ({ searchStr }) => ({ searchStr }),
  });
  const processedTelegramAuth = useRef<string | null>(null);
  const [building, setBuilding] = useLocalStorage(
    "onboarding-dorm-building",
    "",
  );
  const [room, setRoom] = useLocalStorage("onboarding-dorm-room", "");
  const [savedDormAliases, setSavedDormAliases] = useLocalStorage<string[]>(
    "onboarding-dorm-event-groups",
    [],
  );
  const [favoriteSaveError, setFavoriteSaveError] = useState<string | null>(
    null,
  );

  const { mutate: connectTelegramCallback } = $accounts.useMutation(
    "post",
    "/providers/telegram/connect",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $accounts.queryOptions("get", "/users/me").queryKey,
        });
      },
    },
  );
  const {
    data: eventGroups,
    isPending: areEventGroupsPending,
    isError: areEventGroupsError,
    error: eventGroupsError,
  } = $schedule.useQuery("get", "/event-groups/");
  const {
    data: scheduleUser,
    isPending: isScheduleUserPending,
    isError: isScheduleUserError,
    error: scheduleUserError,
  } = $schedule.useQuery("get", "/users/me", {}, { enabled: !!me });
  const {
    data: predefinedGroups,
    isPending: arePredefinedGroupsPending,
    isError: arePredefinedGroupsError,
    error: predefinedGroupsError,
  } = $schedule.useQuery("get", "/users/me/predefined", {}, { enabled: !!me });
  const { mutateAsync: addFavorite, isPending: isFavoriteSavePending } =
    $schedule.useMutation("post", "/users/me/favorites");

  const displayedGroupAliases = [
    ...new Set(predefinedGroups?.event_groups ?? []),
  ];
  const displayedGroups = displayedGroupAliases.flatMap((groupAlias) => {
    const group = eventGroups?.event_groups.find(
      (eventGroup) => eventGroup.alias === groupAlias,
    );
    if (!group) return [];

    const category = getFirstTagByType(group, "category");
    const groupTypes =
      category && category.alias in viewConfig.categories
        ? viewConfig.categories[category.alias].showTagTypes.flatMap(
            (tagType) =>
              getAllTagsByType(group, tagType).flatMap((tag) =>
                tag.name ? [tag.name] : [],
              ),
          )
        : [];

    return [{ alias: group.alias, name: group.name, types: groupTypes }];
  });
  const areVerifyGroupsPending =
    areEventGroupsPending ||
    isScheduleUserPending ||
    arePredefinedGroupsPending;
  const areVerifyGroupsError =
    areEventGroupsError || isScheduleUserError || arePredefinedGroupsError;
  const verifyGroupsError =
    eventGroupsError ?? scheduleUserError ?? predefinedGroupsError;

  async function handleSaveDormGroups(aliases: string[]) {
    setFavoriteSaveError(null);
    setSavedDormAliases(aliases);

    const existingAliases = new Set([
      ...(scheduleUser?.favorite_event_groups ?? []),
      ...(predefinedGroups?.event_groups ?? []),
    ]);
    const aliasesToAdd = aliases.filter((alias) => !existingAliases.has(alias));

    try {
      for (const groupAlias of aliasesToAdd) {
        const updatedScheduleUser = await addFavorite({
          params: { query: { group_alias: groupAlias } },
        });
        queryClient.setQueryData(
          $schedule.queryOptions("get", "/users/me").queryKey,
          updatedScheduleUser,
        );
      }
      await queryClient.invalidateQueries({
        queryKey: $schedule.queryOptions("get", "/users/me").queryKey,
      });
      navigate({ to: "/start", search: { step: 4 } });
    } catch (error) {
      setFavoriteSaveError(formatApiErrorMessage(error));
    }
  }

  useEffect(() => {
    if (!me && step > 1) {
      navigate({ to: "/start", search: { step: 1 } });
      return;
    }
    if (me && !isTelegramConnected && step > 2) {
      navigate({ to: "/start", search: { step: 2 } });
      return;
    }
    if (isTelegramConnected && savedDormAliases.length === 0 && step > 3) {
      navigate({ to: "/start", search: { step: 3 } });
    }
  }, [isTelegramConnected, me, navigate, savedDormAliases.length, step]);

  useEffect(() => {
    const searchParams = new URLSearchParams(searchStr);
    if (!searchParams.has("id")) return;

    const telegramUser = TelegramUser.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!telegramUser.success) return;
    if (processedTelegramAuth.current === telegramUser.data.hash) return;

    processedTelegramAuth.current = telegramUser.data.hash;
    connectTelegramCallback(
      { body: telegramUser.data },
      {
        onSuccess: () => {
          navigate({ to: "/start", search: { step: 2 }, replace: true });
        },
      },
    );
  }, [connectTelegramCallback, navigate, searchStr]);

  return (
    <main className="flex grow justify-center px-4 py-8">
      <div className="flex w-full max-w-2xl flex-col items-center">
        <img src="/favicon.svg" alt="InNoHassle logo" className="h-20 w-20" />
        <h1 className="mt-3 text-center text-3xl font-semibold">
          Welcome to InNoHassle
        </h1>
        <div className="mt-6 w-full">
          <OnboardingProgress step={step} />
        </div>

        <div className="w-full max-w-md">
          <div className="bg-base-200 rounded-box mt-6 flex min-h-80 flex-col px-4 py-6 shadow-sm @sm/content:px-6">
            {step === 1 && (
              <SignInStep
                name={me?.innopolis_info?.name}
                email={me?.innopolis_info?.email}
                onContinue={() =>
                  navigate({ to: "/start", search: { step: 2 } })
                }
              />
            )}
            {step === 2 && (
              <TelegramStep
                telegramName={
                  me?.telegram_info
                    ? [me.telegram_info.first_name, me.telegram_info.last_name]
                        .filter(Boolean)
                        .join(" ")
                    : undefined
                }
                telegramUsername={me?.telegram_info?.username}
                requiresReconnect={requiresTelegramReconnect}
                onContinue={() =>
                  navigate({ to: "/start", search: { step: 3 } })
                }
              />
            )}
            {step === 3 && (
              <DormScheduleStep
                building={building}
                room={room}
                onBuildingChange={setBuilding}
                onRoomChange={setRoom}
                eventGroups={eventGroups}
                isEventGroupsPending={areEventGroupsPending}
                isEventGroupsError={areEventGroupsError}
                eventGroupsError={eventGroupsError}
                isSaving={isFavoriteSavePending}
                saveError={favoriteSaveError}
                onContinue={handleSaveDormGroups}
              />
            )}
            {step === 4 && (
              <VerifyGroupsStep
                groups={displayedGroups}
                isPending={areVerifyGroupsPending}
                isError={areVerifyGroupsError}
                error={verifyGroupsError}
                onContinue={() =>
                  navigate({ to: "/start", search: { step: 5 } })
                }
              />
            )}
            {step === 5 && <CompleteStep />}
          </div>

          {step > 1 && (
            <button
              type="button"
              className="btn btn-ghost mt-3"
              onClick={() =>
                navigate({
                  to: "/start",
                  search: { step: (step - 1) as 1 | 2 | 3 | 4 | 5 },
                })
              }
            >
              <span className="icon-[material-symbols--arrow-back]" />
              Back
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
