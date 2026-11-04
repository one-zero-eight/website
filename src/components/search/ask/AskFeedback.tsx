import { $search } from "@/api/search";
import { PathsAskAsk_query_idFeedbackPostParametersQueryFeedback as AskFeedbackValue } from "@/api/search/types";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

const feedbackEmoji: Record<AskFeedbackValue, string> = {
  [AskFeedbackValue.like]: "👍",
  [AskFeedbackValue.dislike]: "👎",
};

// 👍/👎 under an answer, as in the Telegram bot: the vote goes to the answer's trace in Phoenix, after it only the chosen one is shown
export function AskFeedback({ askQueryId }: { askQueryId: string }) {
  const { showSuccess, showError } = useToast();
  const [chosen, setChosen] = useState<AskFeedbackValue>();

  const { mutate, isPending, variables } = $search.useMutation(
    "post",
    "/ask/{ask_query_id}/feedback",
    {
      onSuccess: (_data, { params }) => {
        setChosen(params.query.feedback);
        showSuccess(
          params.query.feedback === AskFeedbackValue.like
            ? msg`Thank you!`
            : msg`Thank you, we will look into it`,
        );
      },
      onError: (error) => {
        showError(
          msg`Could not save the rating`,
          formatApiErrorDescriptor(error),
        );
      },
    },
  );

  if (chosen) {
    const chosenEmoji = feedbackEmoji[chosen];
    return (
      <span className="text-base-content/60 text-sm">
        <Trans>Rating: {chosenEmoji}</Trans>
      </span>
    );
  }

  return (
    <div className="flex gap-1">
      {[AskFeedbackValue.like, AskFeedbackValue.dislike].map((feedback) => (
        <button
          key={feedback}
          type="button"
          className="btn btn-ghost btn-sm btn-square text-base"
          disabled={isPending}
          onClick={() =>
            mutate({
              params: {
                path: { ask_query_id: askQueryId },
                query: { feedback },
              },
            })
          }
        >
          {isPending && variables?.params.query.feedback === feedback ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            feedbackEmoji[feedback]
          )}
        </button>
      ))}
    </div>
  );
}
