import { Modal } from "@/components/common/Modal.tsx";
import { NEWS, type NewsItem } from "@/components/dashboard/news/news.ts";
import { cn } from "@/lib/ui/cn";
import { useAppLocale } from "@/locales/lib";
import { Trans } from "@lingui/react/macro";
import { useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

const NEWS_TTL_DAYS = 30;
const NEWS_MAX_ITEMS = 5;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

function isFresh(item: NewsItem) {
  return (
    Date.now() - new Date(item.date).getTime() <= NEWS_TTL_DAYS * MS_IN_DAY
  );
}

export function NewsWidget() {
  const [locale] = useAppLocale();
  const [dismissedIds, setDismissedIds] = useLocalStorage<string[]>(
    "widget-news-dismissed",
    [],
  );
  const [openedItem, setOpenedItem] = useState<NewsItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const items = NEWS.filter(
    (item) => isFresh(item) && !dismissedIds.includes(item.id),
  )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, NEWS_MAX_ITEMS);

  const contentLocale = locale === "ru" ? "ru" : "en";
  const OpenedBody = openedItem?.content[contentLocale].Body;

  function dismissItem(id: string) {
    setDismissedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function handleScroll() {
    const slider = sliderRef.current;
    if (!slider) return;
    setActiveIndex(Math.round(slider.scrollLeft / slider.clientWidth));
  }

  function scrollToSlide(index: number) {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollTo({ left: index * slider.clientWidth, behavior: "smooth" });
  }

  return (
    <>
      {items.length > 0 && (
        <div className="bg-base-200 rounded-box relative">
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => {
              const { title, summary } = item.content[contentLocale];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenedItem(item)}
                  className={cn(
                    "group hover:bg-base-200-hover/50 rounded-box flex w-full shrink-0 cursor-pointer snap-center flex-row items-center gap-4 pt-4 pr-16 pl-4 text-left",
                    items.length > 1 ? "pb-1" : "pb-4",
                  )}
                >
                  <span className="icon-[material-symbols--campaign-outline-rounded] text-primary hidden w-12 shrink-0 text-5xl sm:block" />
                  <div className="flex grow flex-col">
                    <div className="text-base-content flex text-lg font-semibold">
                      <span className="icon-[material-symbols--campaign-outline-rounded] text-primary mr-2 shrink-0 text-3xl sm:hidden" />
                      <span>{title}</span>
                    </div>
                    <div className="text-base-content/75">{summary}</div>
                    <span className="text-primary flex w-fit items-center group-hover:underline">
                      <span className="icon-[material-symbols--arrow-forward] mr-1" />
                      <Trans>Learn more</Trans>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="text-base-content/50 hover:bg-base-200-hover/50 hover:text-base-content/75 rounded-box absolute top-0 right-0 flex h-12 w-12 items-center justify-center"
            onClick={() =>
              setDismissedIds((ids) => [...ids, items[activeIndex].id])
            }
          >
            <span className="icon-[material-symbols--close] text-xl" />
          </button>

          {items.length > 1 && (
            <div className="flex items-center justify-center gap-2 pb-1">
              <button
                type="button"
                className="btn btn-ghost btn-circle btn-xs"
                disabled={activeIndex === 0}
                onClick={() => scrollToSlide(activeIndex - 1)}
              >
                <span className="icon-[material-symbols--chevron-left] text-xl" />
              </button>
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "h-2 w-2 rounded-full",
                    index === activeIndex ? "bg-primary" : "bg-base-content/25",
                  )}
                  onClick={() => scrollToSlide(index)}
                />
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-circle btn-xs"
                disabled={activeIndex === items.length - 1}
                onClick={() => scrollToSlide(activeIndex + 1)}
              >
                <span className="icon-[material-symbols--chevron-right] text-xl" />
              </button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={openedItem !== null}
        onOpenChange={(open) => {
          if (open || !openedItem) return;
          dismissItem(openedItem.id);
          setOpenedItem(null);
        }}
        title={openedItem?.content[contentLocale].title}
      >
        <div className="prose prose-quoteless dark:prose-invert prose-img:rounded-box max-w-none">
          {OpenedBody && <OpenedBody />}
        </div>
      </Modal>
    </>
  );
}
