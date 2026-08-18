import { $accounts, accountsTypes } from "@/api/accounts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { AdminUserListItem } from "@/components/admin/AdminUserListItem.tsx";
import { useEffect, useRef, useState } from "react";

export function UserSearch({
  title,
  placeholder = "Name or email...",
  initialQuery = "",
  onSelect,
  selectedUserId,
}: {
  title?: string;
  placeholder?: string;
  initialQuery?: string;
  onSelect?: (user: accountsTypes.SchemaViewUser) => void;
  selectedUserId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!initialQuery) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [initialQuery]);

  const { data, isPending, isFetching, isError, error } = $accounts.useQuery(
    "get",
    "/users/suggest-user-on-typing",
    {
      params: {
        query: {
          query: debouncedQuery,
        },
      },
    },
    {
      enabled: debouncedQuery.length > 0,
    },
  );

  const showResults = debouncedQuery.length > 0;
  const isLoadingResults = isPending || isFetching;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        {title && <span className="text-lg font-medium">{title}</span>}
        <input
          ref={inputRef}
          autoComplete="off"
          spellCheck={false}
          className="input input-bordered w-full"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {showResults && isLoadingResults && (
        <div className="flex flex-col gap-2">
          <div className="skeleton h-14 w-full rounded-xl" />
          <div className="skeleton h-14 w-full rounded-xl" />
        </div>
      )}

      {showResults && isError && (
        <div className="alert alert-error">
          <span>{formatApiErrorMessage(error)}</span>
        </div>
      )}

      {showResults && !isLoadingResults && !isError && data?.length === 0 && (
        <p className="text-base-content/75">No users found.</p>
      )}

      {showResults && !isLoadingResults && !isError && !!data?.length && (
        <ul className="divide-base-300 border-base-300 divide-y rounded-xl border">
          {data.map((user) => (
            <li key={user.id}>
              <AdminUserListItem
                user={user}
                onSelect={onSelect}
                selected={selectedUserId === user.id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
