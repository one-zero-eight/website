// Based on https://github.com/openapi-ts/openapi-typescript/blob/0cc7ee77d28359c7901d9cd3b5733b70a050ea49/packages/openapi-react-query/src/index.ts
// This adds prefix to the query key

/* eslint-disable @typescript-eslint/no-empty-object-type */

import {
  type DataTag,
  type InfiniteData,
  type QueryClient,
  type QueryFunctionContext,
  type SkipToken,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ClientMethod,
  DefaultParamsOption,
  Client as FetchClient,
  MaybeOptionalInit,
  FetchResponse,
} from "@/api/helpers/create-fetch-client";
import {
  HttpMethod,
  MediaType,
  PathsWithMethod,
  RequiredKeysOf,
} from "openapi-typescript-helpers";

// Helper type to dynamically infer the type from the `select` property
type InferSelectReturnType<TData, TSelect> = TSelect extends (
  data: TData,
) => infer R
  ? R
  : TData;

type InitWithUnknowns<Init> = Init & { [key: string]: unknown };

export type QueryKey<
  Prefix extends string,
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init = MaybeOptionalInit<Paths[Path], Method>,
> = Init extends undefined
  ? readonly [Prefix, Method, Path]
  : readonly [Prefix, Method, Path, Init];

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
      InferSelectReturnType<Response["data"], Options["select"]>,
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
) => NoInfer<
  Omit<
    UseQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
      QueryKey<Prefix, Paths, Method, Path>
    >,
    "queryFn" | "queryKey"
  > & {
    queryKey: DataTag<
      QueryKey<Prefix, Paths, Method, Path>,
      Response["data"],
      Response["error"]
    >;
    queryFn: Exclude<
      UseQueryOptions<
        Response["data"],
        Response["error"],
        InferSelectReturnType<Response["data"], Options["select"]>,
        QueryKey<Prefix, Paths, Method, Path>
      >["queryFn"],
      SkipToken | undefined
    >;
  }
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
      InferSelectReturnType<Response["data"], Options["select"]>,
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
) => UseQueryResult<
  InferSelectReturnType<Response["data"], Options["select"]>,
  Response["error"]
>;

export type UseInfiniteQueryMethod<
  Prefix extends string,
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>,
  Options extends Omit<
    UseInfiniteQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<InfiniteData<Response["data"]>, Options["select"]>,
      QueryKey<Prefix, Paths, Method, Path>,
      unknown
    >,
    "queryKey" | "queryFn"
  > & {
    pageParamName?: string;
  },
>(
  method: Method,
  url: Path,
  init: InitWithUnknowns<Init>,
  options: Options,
  queryClient?: QueryClient,
) => UseInfiniteQueryResult<
  InferSelectReturnType<InfiniteData<Response["data"]>, Options["select"]>,
  Response["error"]
>;

export type UseSuspenseQueryMethod<
  Prefix extends string,
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
  Options extends Omit<
    UseSuspenseQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
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
) => UseSuspenseQueryResult<
  InferSelectReturnType<Response["data"], Options["select"]>,
  Response["error"]
>;

export type UseMutationMethod<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType,
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
  TOnMutateResult = unknown,
>(
  method: Method,
  url: Path,
  options?: Omit<
    UseMutationOptions<
      Response["data"],
      Response["error"],
      Init,
      TOnMutateResult
    >,
    "mutationKey" | "mutationFn"
  >,
  queryClient?: QueryClient,
) => UseMutationResult<
  Response["data"],
  Response["error"],
  Init,
  TOnMutateResult
>;

export interface OpenapiQueryClient<
  Prefix extends string,
  Paths extends {},
  Media extends MediaType = MediaType,
> {
  queryOptions: QueryOptionsFunction<Prefix, Paths, Media>;
  useQuery: UseQueryMethod<Prefix, Paths, Media>;
  useSuspenseQuery: UseSuspenseQueryMethod<Prefix, Paths, Media>;
  useInfiniteQuery: UseInfiniteQueryMethod<Prefix, Paths, Media>;
  useMutation: UseMutationMethod<Paths, Media>;
}

export type MethodResponse<
  Prefix extends string,
  CreatedClient extends OpenapiQueryClient<any, any>,
  Method extends HttpMethod,
  Path extends CreatedClient extends OpenapiQueryClient<
    infer Paths,
    infer _Media
  >
    ? PathsWithMethod<Paths, Method>
    : never,
  Options = object,
> =
  CreatedClient extends OpenapiQueryClient<
    Prefix,
    infer Paths extends { [key: string]: any },
    infer Media extends MediaType
  >
    ? NonNullable<FetchResponse<Paths[Path][Method], Options, Media>["data"]>
    : never;

// TODO: Add the ability to bring queryClient as argument
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
    const { data, error, response } = await fn(path, {
      signal,
      ...(init as any),
    }); // TODO: find a way to avoid as any
    if (error) {
      throw error;
    }
    if (
      response.status === 204 ||
      response.headers.get("Content-Length") === "0"
    ) {
      return data ?? null;
    }

    return data;
  };

  const queryOptions: QueryOptionsFunction<Prefix, Paths, Media> = (
    method,
    path,
    ...[init, options]
  ) => ({
    queryKey: (init === undefined
      ? ([prefix, method, path] as const)
      : ([prefix, method, path, init] as const)) as DataTag<
      QueryKey<Prefix, Paths, typeof method, typeof path>,
      any,
      any
    >,
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
    useSuspenseQuery: (method, path, ...[init, options, queryClient]) =>
      useSuspenseQuery(
        queryOptions(
          method,
          path,
          init as InitWithUnknowns<typeof init>,
          options,
        ),
        queryClient,
      ),
    useInfiniteQuery: (method, path, init, options, queryClient) => {
      const { pageParamName = "cursor", ...restOptions } = options;
      const { queryKey } = queryOptions(method, path, init);
      return useInfiniteQuery(
        {
          queryKey,
          queryFn: async ({
            queryKey: [_, method, path, init],
            pageParam = 0,
            signal,
          }) => {
            const mth = method.toUpperCase() as Uppercase<typeof method>;
            const fn = client[mth] as ClientMethod<Paths, typeof method, Media>;
            const mergedInit = {
              ...init,
              signal,
              params: {
                ...(init?.params || {}),
                query: {
                  ...(init?.params as { query?: DefaultParamsOption })?.query,
                  [pageParamName]: pageParam,
                },
              },
            };

            const { data, error } = await fn(path, mergedInit as any);
            if (error) {
              throw error;
            }
            return data;
          },
          ...restOptions,
        },
        queryClient,
      );
    },
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
