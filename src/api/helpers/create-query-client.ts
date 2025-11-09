// Based on https://github.com/openapi-ts/openapi-typescript/blob/main/packages/openapi-react-query/src/index.ts
// This adds prefix to the query key

/* eslint-disable @typescript-eslint/no-empty-object-type */

import {
  type QueryClient,
  type QueryFunctionContext,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  Client as FetchClient,
  ClientMethod,
  FetchResponse,
  MaybeOptionalInit,
} from "openapi-fetch";
import type {
  HttpMethod,
  MediaType,
  PathsWithMethod,
  RequiredKeysOf,
} from "openapi-typescript-helpers";

type InitWithUnknowns<Init> = Init & { [key: string]: unknown };

export type QueryKey<
  Prefix extends string,
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
> = readonly [Prefix, Method, Path, MaybeOptionalInit<Paths[Path], Method>];

export type QueryOptionsFunction<
  Prefix extends string,
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
  Options extends Omit<
    UseQueryOptions<
      Response["data"],
      Response["error"],
      Response["data"],
      QueryKey<Prefix, Paths, Method, Path>
    >,
    "queryKey" | "queryFn"
  >,
>(
  method: Method,
  path: Path,
  ...[init, options]: RequiredKeysOf<Init> extends never
    ? [InitWithUnknowns<Init>?, Options?]
    : [InitWithUnknowns<Init>, Options?]
) => UseQueryOptions<
  Response["data"],
  Response["error"],
  Response["data"],
  QueryKey<Prefix, Paths, Method, Path>
>;

export type UseQueryMethod<
  Prefix extends string,
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
  Options extends Omit<
    UseQueryOptions<
      Response["data"],
      Response["error"],
      Response["data"],
      QueryKey<Prefix, Paths, Method, Path>
    >,
    "queryKey" | "queryFn"
  >,
>(
  method: Method,
  url: Path,
  ...[init, options, queryClient]: RequiredKeysOf<Init> extends never
    ? [InitWithUnknowns<Init>?, Options?, QueryClient?]
    : [InitWithUnknowns<Init>, Options?, QueryClient?]
) => UseQueryResult<Response["data"], Response["error"]>;

export type UseMutationMethod<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
  Options extends Omit<
    UseMutationOptions<Response["data"], Response["error"], Init>,
    "mutationKey" | "mutationFn"
  >,
>(
  method: Method,
  url: Path,
  options?: Options,
  queryClient?: QueryClient,
) => UseMutationResult<Response["data"], Response["error"], Init>;

export interface OpenapiQueryClient<
  Prefix extends string,
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType = MediaType,
> {
  queryOptions: QueryOptionsFunction<Prefix, Paths, Media>;
  useQuery: UseQueryMethod<Prefix, Paths, Media>;
  useMutation: UseMutationMethod<Paths, Media>;
}

export default function createClient<
  Prefix extends string,
  Paths extends {},
  Media extends MediaType = MediaType,
>(
  client: FetchClient<Paths, Media>,
  prefix: Prefix,
): OpenapiQueryClient<Prefix, Paths, Media> {
  const queryFn = async <
    Method extends HttpMethod,
    Path extends PathsWithMethod<Paths, Method>,
  >({
    queryKey: [_, method, path, init],
    signal,
  }: QueryFunctionContext<QueryKey<Prefix, Paths, Method, Path>>) => {
    const mth = method.toUpperCase() as Uppercase<typeof method>;
    const fn = client[mth] as ClientMethod<Paths, typeof method, Media>;
    const { data, error } = await fn(path, { signal, ...(init as any) });
    if (error || !data) {
      throw error;
    }
    return data;
  };

  const queryOptions: QueryOptionsFunction<Prefix, Paths, Media> = (
    method,
    path,
    ...[init, options]
  ) => ({
    queryKey: [
      prefix,
      method,
      path,
      init as InitWithUnknowns<typeof init>,
    ] as const,
    queryFn,
    ...options,
  });

  return {
    queryOptions,
    useQuery: (method, path, ...[init, options, queryClient]) =>
      useQuery(
        queryOptions(
          method,
          path,
          init as InitWithUnknowns<typeof init>,
          options,
        ),
        queryClient,
      ),
    useMutation: (method, path, options, queryClient) =>
      useMutation(
        {
          mutationKey: [method, path],
          mutationFn: async (init) => {
            const mth = method.toUpperCase() as Uppercase<typeof method>;
            const fn = client[mth] as ClientMethod<Paths, typeof method, Media>;
            const { data, error } = await fn(
              path,
              init as InitWithUnknowns<typeof init>,
            );
            if (error || data === undefined) {
              throw error;
            }
            return data;
          },
          ...options,
        },
        queryClient,
      ),
  };
}
