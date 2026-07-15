import { $accounts } from "@/api/accounts";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { queryClient } from "@/app/query-client.ts";
import { T } from "@/lib/utils/dates";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

const TOKEN_KEY = "roomTvAccessToken";
const ROOM_ID_KEY = "roomTvId";
const DEVICE_FLOW_CODE_KEY = "roomTvDeviceFlowCode";
const DEVICE_FLOW_SECRET_KEY = "roomTvDeviceFlowSecret";

export function isRoomTvPage() {
  return (
    window.location.pathname === "/tv" ||
    window.location.pathname.startsWith("/tv/")
  );
}

export function getRoomTvAccessToken() {
  // Remove quotes as this is stored as JSON
  return localStorage.getItem(TOKEN_KEY)?.slice(1, -1) ?? null;
}

export function invalidateRoomTvAccessToken() {
  const prevToken = getRoomTvAccessToken();
  if (!prevToken) return false;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROOM_ID_KEY);
  localStorage.removeItem(DEVICE_FLOW_CODE_KEY);
  localStorage.removeItem(DEVICE_FLOW_SECRET_KEY);
  window.dispatchEvent(new StorageEvent("local-storage", { key: TOKEN_KEY }));
  window.dispatchEvent(new StorageEvent("local-storage", { key: ROOM_ID_KEY }));
  queryClient.clear();
  return true;
}

export function useRoomTvAccessToken() {
  return useLocalStorage<string | null>(TOKEN_KEY, null);
}

export function useTvRoomId() {
  return useLocalStorage<string | null>(ROOM_ID_KEY, null);
}

export function useRoomTvAuth() {
  const [accessToken, setAccessToken] = useRoomTvAccessToken();
  const [roomId, setRoomId] = useTvRoomId();
  const [deviceFlowCode, setDeviceFlowCode] = useLocalStorage<string | null>(
    DEVICE_FLOW_CODE_KEY,
    null,
  );
  const [deviceFlowSecret, setDeviceFlowSecret] = useLocalStorage<
    string | null
  >(DEVICE_FLOW_SECRET_KEY, null);

  const { data: newDeviceFlow, isPending: isStartingFlow } = $accounts.useQuery(
    "post",
    "/rooms/start-device-flow",
    {},
    {
      enabled: !accessToken && !deviceFlowCode,
      staleTime: Infinity,
      retry: 3,
    },
  );

  useEffect(() => {
    if (!newDeviceFlow?.code || !newDeviceFlow.secret_string) return;
    setDeviceFlowCode(newDeviceFlow.code);
    setDeviceFlowSecret(newDeviceFlow.secret_string);
  }, [newDeviceFlow, setDeviceFlowCode, setDeviceFlowSecret]);

  const code = deviceFlowCode ?? newDeviceFlow?.code ?? null;
  const secret = deviceFlowSecret ?? newDeviceFlow?.secret_string ?? null;

  const {
    data: deviceFlowResult,
    error: pollError,
    isFetching: isPolling,
  } = $accounts.useQuery(
    "post",
    "/rooms/device-flow-token",
    {
      params: {
        query: {
          code: code ?? "",
          secret_string: secret ?? "",
        },
      },
    },
    {
      enabled: !accessToken && !!code && !!secret,
      refetchInterval: !accessToken && !!code ? 3 * T.Sec : false,
      retry: false,
    },
  );

  useEffect(() => {
    if (accessToken || !deviceFlowResult?.token || !deviceFlowResult.room_id) {
      return;
    }

    setAccessToken(deviceFlowResult.token);
    setRoomId(deviceFlowResult.room_id);
    setDeviceFlowCode(null);
    setDeviceFlowSecret(null);
  }, [
    accessToken,
    deviceFlowResult,
    setAccessToken,
    setRoomId,
    setDeviceFlowCode,
    setDeviceFlowSecret,
  ]);

  useEffect(() => {
    if (
      !pollError ||
      !isApiHttpError(pollError) ||
      (pollError.httpCode !== 403 && pollError.httpCode !== 404)
    ) {
      return;
    }

    setDeviceFlowCode(null);
    setDeviceFlowSecret(null);
  }, [pollError, setDeviceFlowCode, setDeviceFlowSecret]);

  const isAuthenticated = !!accessToken && !!roomId;

  return {
    isAuthenticated,
    roomId: roomId ?? undefined,
    code: code ?? undefined,
    isPending:
      !isAuthenticated &&
      (isStartingFlow || (!!code && isPolling && !deviceFlowResult?.token)),
    error: pollError ? formatApiErrorMessage(pollError) : undefined,
  };
}
