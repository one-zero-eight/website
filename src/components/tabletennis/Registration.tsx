import { useState } from "react";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";

export function Registration({ onRegistered }: { onRegistered: () => void }) {
  const [nick, setNick] = useState("");
  const [agreed, setAgreed] = useState(false);
  const { showError } = useToast();
  const { mutate, isPending } = $tabletennis.useMutation("post", "/reg", {
    onSuccess: () => onRegistered(),
    onError: (error) => showError("Error", formatApiErrorMessage(error)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nick.trim() && agreed) {
      mutate({ params: { query: { nick: nick.trim() } } });
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="bg-base-200 mx-4 w-full max-w-md rounded-lg p-8">
        <h1 className="mb-2 text-2xl font-semibold">
          Welcome to Table Tennis Club!
        </h1>
        <p className="text-base-content/70 mb-6 text-sm">
          You need to register with a nickname to start playing and tracking
          your rating. Your results will be visible on the leaderboard.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Enter your nickname"
            className="input input-bordered w-full"
            maxLength={50}
            required
          />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="checkbox checkbox-sm mt-0.5"
            />
            <span className="text-base-content/70 leading-snug">
              By clicking the button, you agree to be displayed in the overall
              player chart
            </span>
          </label>
          <button
            type="submit"
            className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-6 py-3 text-sm font-medium text-white transition-all duration-150 hover:bg-[#712BB2]/90 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isPending || !nick.trim() || !agreed}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Register"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
