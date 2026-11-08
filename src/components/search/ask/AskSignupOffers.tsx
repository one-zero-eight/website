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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.locale, {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatClock = (value: string) =>
    new Date(value).toLocaleTimeString(i18n.locale, {
      timeZone: "Europe/Moscow",
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

  const groups = new Map<string, searchTypes.SchemaSignupOffer[]>();
  for (const original of offers) {
    const offer = results[original.id] ?? original;
    const validDates =
      Number.isFinite(Date.parse(offer.starts_at)) &&
      (offer.ends_at == null || Number.isFinite(Date.parse(offer.ends_at)));
    const date = !validDates
      ? t`Invalid event interval`
      : offer.all_day
        ? formatAllDay(offer)
        : formatDate(offer.starts_at);
    const group = groups.get(date);
    if (group) group.push(offer);
    else groups.set(date, [offer]);
  }

  return (
    <div className="border-base-300 bg-base-100/40 rounded-box @container/signup my-2 w-full min-w-0 overflow-hidden border">
      {Array.from(groups, ([date, group]) => (
        <section
          key={date}
          className="border-base-300 border-t first:border-t-0"
        >
          <h3 className="bg-base-200/60 text-base-content/60 px-4 py-2 text-xs font-medium">
            {date} · MSK
          </h3>
          <ul className="divide-base-300 divide-y">
            {group.map((offer) => {
              const start = Date.parse(offer.starts_at);
              const invalid =
                !Number.isFinite(start) ||
                (offer.ends_at != null && !(Date.parse(offer.ends_at) > start));
              const expired =
                expiredIds.includes(offer.id) ||
                !(Date.parse(offer.expires_at) > Date.now()) ||
                start <= Date.now();
              const overnight =
                !invalid &&
                offer.ends_at != null &&
                formatDate(offer.starts_at) !== formatDate(offer.ends_at);
              return (
                <li
                  key={offer.id}
                  className="grid min-w-0 grid-cols-1 items-center gap-x-5 gap-y-3 px-4 py-3 @min-[28rem]/signup:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm leading-snug font-medium wrap-anywhere">
                      {offer.title}
                    </h4>
                    <p className="text-base-content/60 mt-1 text-xs leading-relaxed wrap-anywhere tabular-nums">
                      {invalid ? (
                        t`Invalid event interval`
                      ) : offer.all_day ? (
                        <>
                          <Trans>All day</Trans>
                        </>
                      ) : (
                        <>
                          {overnight
                            ? formatTime(offer.starts_at)
                            : formatClock(offer.starts_at)}
                          {offer.ends_at &&
                            (overnight
                              ? ` – ${formatTime(offer.ends_at)}`
                              : `–${formatClock(offer.ends_at)}`)}
                        </>
                      )}
                      {offer.location && ` · ${offer.location}`}
                    </p>
                  </div>
                  <div className="flex min-h-9 items-center text-sm @min-[28rem]/signup:max-w-48 @min-[28rem]/signup:justify-self-end">
                    {pendingId === offer.id ? (
                      <span className="text-base-content/60 flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm" />
                        <Trans>Signing up…</Trans>
                      </span>
                    ) : offer.status === "confirmed" ? (
                      <span className="text-success flex items-center gap-1.5 font-medium">
                        <span className="icon-[material-symbols--check-circle-outline] shrink-0 text-lg" />
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
                        <Trans>
                          This offer has expired. Ask for current events.
                        </Trans>
                      </span>
                    ) : offer.external_url ? (
                      <a
                        href={offer.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-primary btn-sm h-auto min-h-9 gap-1.5 py-2 text-left"
                      >
                        <Trans>Open registration</Trans>
                        <span className="icon-[material-symbols--open-in-new] shrink-0" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-primary btn-sm min-h-9 px-4"
                        disabled={disabled || pendingId !== null}
                        onClick={() => handleSignup(offer)}
                      >
                        <Trans>Sign up</Trans>
                      </button>
                    )}
                  </div>
                  {pendingId !== offer.id &&
                    offer.status !== "confirmed" &&
                    offer.message && (
                      <p className="text-base-content/70 text-xs leading-relaxed wrap-anywhere @min-[28rem]/signup:col-span-2">
                        {offer.message}
                      </p>
                    )}
                  {offer.status === "unknown" && offer.source_url && (
                    <a
                      href={offer.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary justify-self-start text-xs underline underline-offset-2 @min-[28rem]/signup:col-span-2"
                    >
                      <Trans>Check registration in the service</Trans>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
