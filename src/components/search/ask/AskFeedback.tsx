import { $search } from "@/api/search";
import { PathsAskAsk_query_idFeedbackPostParametersQueryFeedback as AskFeedbackValue } from "@/api/search/types";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";

const feedbackEmoji: Record<AskFeedbackValue, string> = {
  [AskFeedbackValue.like]: "👍",
  [AskFeedbackValue.dislike]: "👎",
};

// The API takes at most this many characters in a comment
const COMMENT_MAX_LENGTH = 2000;

// 👍/👎 under an answer, as in the Telegram bot: the vote goes to the answer's trace in Phoenix, after it only the chosen one is
// shown, with a box to say what was liked or not; the comment is sent with the same vote and becomes its explanation in Phoenix
export function AskFeedback({ askQueryId }: { askQueryId: string }) {
  const { t } = useLingui();
  const { showSuccess, showError } = useToast();
  const [chosen, setChosen] = useState<AskFeedbackValue>();
  const [comment, setComment] = useState("");
  const [isCommentSent, setIsCommentSent] = useState(false);

  const vote = $search.useMutation("post", "/ask/{ask_query_id}/feedback", {
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
  });

  const sendComment = $search.useMutation(
    "post",
    "/ask/{ask_query_id}/feedback",
    {
      onSuccess: () => {
        setIsCommentSent(true);
        showSuccess(msg`Thank you for the comment!`);
      },
      onError: (error) => {
        showError(
          msg`Could not send the comment`,
          formatApiErrorDescriptor(error),
        );
      },
    },
  );

  if (chosen) {
    const chosenEmoji = feedbackEmoji[chosen];
    return (
      <div className="flex flex-col gap-2">
        <span className="text-base-content/60 text-sm">
          <Trans>Rating: {chosenEmoji}</Trans>
        </span>
        {!isCommentSent && (
          <>
            <textarea
              className="textarea resize-y"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              placeholder={
                chosen === AskFeedbackValue.like
                  ? t`What did you like?`
                  : t`What was wrong?`
              }
              disabled={sendComment.isPending}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm self-start"
              disabled={!comment.trim() || sendComment.isPending}
              onClick={() =>
                sendComment.mutate({
                  params: {
                    path: { ask_query_id: askQueryId },
                    query: { feedback: chosen },
                  },
                  body: { comment: comment.trim() },
                })
              }
            >
              {sendComment.isPending && (
                <span className="loading loading-spinner loading-sm" />
              )}
              <Trans>Send</Trans>
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {[AskFeedbackValue.like, AskFeedbackValue.dislike].map((feedback) => (
        <button
          key={feedback}
          type="button"
          className="btn btn-ghost btn-sm btn-square text-base"
          disabled={vote.isPending}
          onClick={() =>
            vote.mutate({
              params: {
                path: { ask_query_id: askQueryId },
                query: { feedback },
              },
            })
          }
        >
          {vote.isPending &&
          vote.variables?.params.query.feedback === feedback ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            feedbackEmoji[feedback]
          )}
        </button>
      ))}
    </div>
  );
}
