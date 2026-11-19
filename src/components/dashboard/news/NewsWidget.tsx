import { Modal } from "@/components/common/Modal.tsx";
import { NEWS } from "@/components/dashboard/news/news.ts";
import { useAppLocale } from "@/locales/lib";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";

const NEWS_TTL_DAYS = 30;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

export function NewsWidget() {
  const [locale] = useAppLocale();
  const [dismissedId, setDismissedId] = useLocalStorage<string | null>(
    "widget-news-dismissed",
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const latest = NEWS[0];
  if (!latest) return null;
  if (latest.id === dismissedId) return null;
  if (Date.now() - new Date(latest.date).getTime() > NEWS_TTL_DAYS * MS_IN_DAY)
    return null;

  const { title, summary, Body } =
    latest.content[locale === "ru" ? "ru" : "en"];

  return (
    <>
      <div className="bg-base-200 rounded-box flex flex-row items-center gap-4 px-4 py-4">
        <span className="icon-[material-symbols--campaign-outline-rounded] text-primary hidden w-12 shrink-0 text-5xl sm:block" />
        <div className="flex grow flex-col">
          <div className="text-base-content flex text-lg font-semibold">
            <span className="icon-[material-symbols--campaign-outline-rounded] text-primary mr-2 shrink-0 text-3xl sm:hidden" />
            <span>{title}</span>
          </div>
          <div className="text-base-content/75">{summary}</div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-primary flex w-fit items-center hover:underline"
          >
            <span className="icon-[material-symbols--arrow-forward] mr-1" />
            <Trans>Learn more</Trans>
          </button>
        </div>
        <button
          type="button"
          className="text-base-content/50 hover:bg-base-200-hover/50 hover:text-base-content/75 rounded-box flex h-12 w-12 shrink-0 items-center justify-center self-start"
          onClick={() => setDismissedId(latest.id)}
        >
          <span className="icon-[material-symbols--close] text-xl" />
        </button>
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={title}>
        <div className="prose prose-quoteless dark:prose-invert prose-img:rounded-box max-w-none">
          <Body />
        </div>
      </Modal>
    </>
  );
}
