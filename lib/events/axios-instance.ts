import { getAuthToken, unsetAuthToken } from "@/lib/auth";
import { EVENTS_API_URL } from "@/lib/events";
import Axios, { AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = Axios.create({ baseURL: EVENTS_API_URL });

/**
 * Custom Axios instance creating.
 * Adds Authorization header and handles auth errors.
 */
export const axiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const source = Axios.CancelToken.source();

  const token = getAuthToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders.Authorization = "Bearer " + token;
  }

  const promise = AXIOS_INSTANCE<T>({
    ...config,
    ...options,
    headers: {
      ...authHeaders,
      ...config.headers,
      ...options?.headers,
    },
    cancelToken: source.token,
  })
    .then(({ data }) => data)
    .catch((reason) => {
      if (reason.response.status === 403 && token) {
        console.warn("Authentication fail. Resetting token.");
        unsetAuthToken();
      }
      return {} as T;
    });

  // @ts-ignore
  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};
