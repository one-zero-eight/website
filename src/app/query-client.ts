import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",

      retry: (failureCount, error) => {
        if (error.message === "Unauthorized") {
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
