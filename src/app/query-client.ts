import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",

      retry: (failureCount, error) => {
        if (isAxiosError(error) && error.response?.status === 401) {
          return false; // Do not retry on auth error
        }

        // Proceed with default behavior
        const defaultRetry = new QueryClient().getDefaultOptions().queries
          ?.retry;
        return typeof defaultRetry === "number" && failureCount < defaultRetry;
      },
    },
  },
});
