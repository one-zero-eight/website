import { $search, searchTypes } from "@/api/search";
import { SignupOfferStatus } from "@/api/search/types";
import { queryClient } from "@/app/query-client";
import { Trans, useLingui } from "@lingui/react/macro";
import { useRef, useState } from "react";
import { rememberSignup, sportHeaders } from "./ask-session";

// These are exact server offers, not commands parsed from the assistant's Markdown.
export function AskSignupOffers({
  chatId,
  offers,
  disabled = false,
}: {
  chatId: string;
  offers: searchTypes.SchemaSignupOffer[];
  disabled?: boolean;
}) {
  const { i18n, t } = useLingui();
  const [results, setResults] = useState<
    Record<string, searchTypes.SchemaSignupOffer>
  >({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expiredIds, setExpiredIds] = useState<string[]>([]);
  const busy = useRef(false);
  const signup = $search.useMutation(
    "post",
    "/ask/{chat_id}/signup/{offer_id}",
    {
      retry: false,
    },
  );

  async function handleSignup(offer: searchTypes.SchemaSignupOffer) {
    if (
      busy.current ||
      disabled ||
      offer.status !== "available" ||
      offer.external_url
    )
      return;
    if (
      !(Date.parse(offer.expires_at) > Date.now()) ||
      !(Date.parse(offer.starts_at) > Date.now())
    ) {
      setExpiredIds((previous) => [...previous, offer.id]);
      return;
    }
    busy.current = true;
    setPendingId(offer.id);
    const unknown: searchTypes.SchemaSignupOffer = {
      ...offer,
      status: SignupOfferStatus.unknown,
      message: t`Check the service before trying again. Do not repeat an uncertain registration.`,
    };
    // A reload or navigation must not turn an in-flight write into a fresh signup button.
    rememberSignup(chatId, unknown);
    try {
      const result = await signup.mutateAsync({
        params: { path: { chat_id: chatId, offer_id: offer.id } },
        headers: offer.service === "sport" ? await sportHeaders() : {},
      });
      setResults((previous) => ({ ...previous, [offer.id]: result }));
      rememberSignup(chatId, result);
    } catch {
      setResults((previous) => ({ ...previous, [offer.id]: unknown }));
      rememberSignup(chatId, unknown);
    } finally {
      busy.current = false;
      setPendingId(null);
      void queryClient.invalidateQueries({
        queryKey: $search.queryOptions("get", "/ask/chats/{chat_id}", {
          params: { path: { chat_id: chatId } },
        }).queryKey,
      });
      void queryClient.invalidateQueries({ queryKey: [offer.service] });
    }
  }

  const formatTime = (value: string) =>
    new Date(value).toLocaleString(i18n.locale, {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

  const formatAllDay = (offer: searchTypes.SchemaSignupOffer) => {
    // Match the host's Moscow date bounds; the end date is exclusive. Source
    // clocks on all-day trainings are display values, not a timed interval.
    const localDay = (value: string) =>
      Date.parse(
        `${new Date(value).toLocaleDateString("sv-SE", {
          timeZone: "Europe/Moscow",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}T00:00:00Z`,
      );
    const first = localDay(offer.starts_at);
    const last = offer.ends_at
      ? Math.max(first, localDay(offer.ends_at) - 24 * 60 * 60 * 1000)
      : first;
    const format = (value: number) =>
      new Date(value).toLocaleDateString(i18n.locale, {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    return first === last
      ? format(first)
      : `${format(first)} – ${format(last)}`;
  };

  return (
    <ul className="flex flex-col gap-2">
      {offers.map((original) => {
        const offer = results[original.id] ?? original;
        const start = Date.parse(offer.starts_at);
        const invalid =
          !Number.isFinite(start) ||
          (offer.ends_at != null && !(Date.parse(offer.ends_at) > start));
        const expired =
          expiredIds.includes(offer.id) ||
          !(Date.parse(offer.expires_at) > Date.now()) ||
          start <= Date.now();
        return (
          <li key={offer.id} className="flex flex-col items-start gap-1">
            <span>
              {offer.title} ·{" "}
              {invalid ? (
                t`Invalid event interval`
              ) : offer.all_day ? (
                <>
                  {formatAllDay(offer)} · <Trans>All day</Trans>
                </>
              ) : (
                <>
                  {formatTime(offer.starts_at)}
                  {offer.ends_at && ` – ${formatTime(offer.ends_at)}`} (MSK)
                </>
              )}
              {offer.location && ` · ${offer.location}`}
            </span>
            {pendingId === offer.id ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm" />
                <Trans>Signing up…</Trans>
              </span>
            ) : offer.status === "confirmed" ? (
              <span className="text-success">
                <Trans>You are signed up</Trans>
              </span>
            ) : offer.status === "refused" ? (
              <span className="text-error">
                <Trans>Could not sign up</Trans>
              </span>
            ) : offer.status === "unknown" ? (
              <span className="text-warning">
                <Trans>Registration outcome is unknown</Trans>
              </span>
            ) : invalid ? (
              <span className="text-error">
                <Trans>Signup unavailable</Trans>
              </span>
            ) : expired ? (
              <span className="text-base-content/60">
                <Trans>This offer has expired. Ask for current events.</Trans>
              </span>
            ) : offer.external_url ? (
              <a
                href={offer.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                <Trans>Open registration</Trans>
              </a>
            ) : (
              <button
                type="button"
                className="text-primary cursor-pointer text-left underline underline-offset-2 disabled:cursor-default disabled:opacity-50"
                disabled={disabled || pendingId !== null}
                onClick={() => handleSignup(offer)}
              >
                <Trans>Sign up</Trans>
              </button>
            )}
            {pendingId !== offer.id && offer.message && (
              <span className="text-sm">{offer.message}</span>
            )}
            {offer.status === "unknown" && offer.source_url && (
              <a
                href={offer.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                <Trans>Check registration in the service</Trans>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
