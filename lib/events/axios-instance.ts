"use client";
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
  const promise = AXIOS_INSTANCE<T>({
    withCredentials: true,
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};
