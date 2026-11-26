import { $search } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useInvalidateAdmin } from "./admin-utils";

// The "official" mark of a chat (Telegram or MAX): only such chats may be called official in the answers
export function OfficialToggle({
  chatId,
  official,
}: {
  chatId: number;
  official: boolean;
}) {
  const { showSuccess, showError } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const { mutate, isPending } = $search.useMutation(
    "put",
    "/admin/chats/{chat_id}/official",
    {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Saved`);
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );

  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        className="toggle"
        checked={official}
        disabled={isPending}
        onChange={(event) =>
          mutate({
            params: { path: { chat_id: chatId } },
            body: { official: event.target.checked },
          })
        }
      />
      <span>
        <Trans>Official chat</Trans>
      </span>
    </label>
  );
}
