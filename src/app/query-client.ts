import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",

      retry: (failureCount, error) => {
        if (error instanceof Error && error.message === "Unauthorized") {
          return false; // Do not retry on auth error
        }
        if (
          typeof error === "object" &&
          error !== null &&
          "httpCode" in error &&
          error.httpCode === 401
        ) {
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
