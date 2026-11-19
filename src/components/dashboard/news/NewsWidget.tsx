import { Modal } from "@/components/common/Modal.tsx";
import { NEWS, type NewsItem } from "@/components/dashboard/news/news.ts";
import { cn } from "@/lib/ui/cn";
import { useAppLocale } from "@/locales/lib";
import { Trans } from "@lingui/react/macro";
import { useRef, useState } from "react";

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
  const [dismissed, setDismissed] = useState(false);
  const [openedItem, setOpenedItem] = useState<NewsItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const items = NEWS.filter(isFresh)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, NEWS_MAX_ITEMS);
  if (dismissed || items.length === 0) return null;

  const contentLocale = locale === "ru" ? "ru" : "en";
  const OpenedBody = openedItem?.content[contentLocale].Body;

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
      <div className="bg-base-200 rounded-box relative">
        <div
          ref={sliderRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const { title, summary } = item.content[contentLocale];
            return (
              <div
                key={item.id}
                className="flex w-full shrink-0 snap-center flex-row items-center gap-4 py-4 pr-16 pl-4"
              >
                <span className="icon-[material-symbols--campaign-outline-rounded] text-primary hidden w-12 shrink-0 text-5xl sm:block" />
                <div className="flex grow flex-col">
                  <div className="text-base-content flex text-lg font-semibold">
                    <span className="icon-[material-symbols--campaign-outline-rounded] text-primary mr-2 shrink-0 text-3xl sm:hidden" />
                    <span>{title}</span>
                  </div>
                  <div className="text-base-content/75">{summary}</div>
                  <button
                    type="button"
                    onClick={() => setOpenedItem(item)}
                    className="text-primary flex w-fit items-center hover:underline"
                  >
                    <span className="icon-[material-symbols--arrow-forward] mr-1" />
                    <Trans>Learn more</Trans>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="text-base-content/50 hover:bg-base-200-hover/50 hover:text-base-content/75 rounded-box absolute top-0 right-0 flex h-12 w-12 items-center justify-center"
          onClick={() => setDismissed(true)}
        >
          <span className="icon-[material-symbols--close] text-xl" />
        </button>

        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-2">
            <button
              type="button"
              className="btn btn-ghost btn-circle btn-sm"
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
              className="btn btn-ghost btn-circle btn-sm"
              disabled={activeIndex === items.length - 1}
              onClick={() => scrollToSlide(activeIndex + 1)}
            >
              <span className="icon-[material-symbols--chevron-right] text-xl" />
            </button>
          </div>
        )}
      </div>

      <Modal
        open={openedItem !== null}
        onOpenChange={(open) => !open && setOpenedItem(null)}
        title={openedItem?.content[contentLocale].title}
      >
        <div className="prose prose-quoteless dark:prose-invert prose-img:rounded-box max-w-none">
          {OpenedBody && <OpenedBody />}
        </div>
      </Modal>
    </>
  );
}
