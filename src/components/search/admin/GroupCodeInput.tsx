import { $search } from "@/api/search";
import { GROUP_CODE_PATTERN } from "./admin-utils";
import { Trans } from "@lingui/react/macro";
import { useId } from "react";

// A study group code with the codes already in use as suggestions
export function GroupCodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const { data: codes } = $search.useQuery("get", "/admin/groups");
  const isInvalid = value !== "" && !GROUP_CODE_PATTERN.test(value);

  return (
    <div className="flex flex-col gap-1">
      <input
        className="input w-full max-w-xs"
        list={listId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {codes?.map((code) => (
          <option key={code} value={code} />
        ))}
      </datalist>
      {isInvalid && (
        <span className="text-error text-sm">
          <Trans>
            Letters, digits, dot, dash and underscore; up to 40 characters.
          </Trans>
        </span>
      )}
    </div>
  );
}
