import { axiosQuery } from "@/lib/search/api/axios";
import { useQuery } from "@tanstack/react-query";
import Axios from "axios";

export function usePreviewFile(url: string | undefined) {
  return useQuery({
    queryKey: ["preview-file", url],
    queryFn: async ({ signal }) => {
      if (!url) {
        return undefined;
      }

      const urlObject = new URL(url);
      if (urlObject.origin === process.env.NEXT_PUBLIC_SEARCH_API_URL) {
        // Add authorization header if the URL is from our API
        return axiosQuery<Blob | any>({
          url,
          method: "GET",
          signal,
          responseType: "blob",
        });
      }

      // Use Axios to download the file
      const source = Axios.CancelToken.source();
      const promise = Axios<Blob | any>({
        url,
        method: "GET",
        cancelToken: source.token,
        responseType: "blob",
      }).then(({ data }) => data);

      // @ts-ignore
      promise.cancel = () => {
        source.cancel("Query was cancelled");
      };

      return promise;
    },
    enabled: !!url,
  });
}
