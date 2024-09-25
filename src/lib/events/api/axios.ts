import { getMyAccessToken, invalidateMyAccessToken } from "@/lib/auth/access";
import Axios, { AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_EVENTS_API_URL,
});

AXIOS_INSTANCE.interceptors.request.use(async (request) => {
  const token = getMyAccessToken();
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response } = error;
    if (response.status === 401) {
      invalidateMyAccessToken();
      return Promise.reject(error);
    }
  },
);

export const axiosQuery = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE<T>({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-expect-error Cancel method for TanStack Query
  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};
