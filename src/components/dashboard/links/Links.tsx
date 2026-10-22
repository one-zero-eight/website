import { groups } from "@/components/dashboard/links/constants.ts";
import CustomSelect from "@/components/dashboard/links/CustomSelect.tsx";
import {
  globalFrequencies,
  resourcesList,
} from "@/components/dashboard/links/resources-list.ts";
import { SearchInput } from "@/components/dashboard/links/SearchInput.tsx";
import {
  createFuseInstance,
  getFilteredResources,
} from "@/components/dashboard/links/searchUtils.ts";
import { cn } from "@/lib/ui/cn";
import { useAppLocale } from "@/locales/lib";
import { Trans } from "@lingui/react/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const Links = () => {
  const [locale] = useAppLocale();
  const isRu = locale === "ru";
  const [activeGroup, setActiveGroup] = useState("All");
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const timeoutRef = useRef<number>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const fuse = useMemo(() => createFuseInstance(resourcesList), []);

  const userFrequencies = useMemo(() => {
    const stored = localStorage.getItem("userFrequencies");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const filteredResources = useMemo(
    () =>
      getFilteredResources(
        resourcesList,
        searchQuery,
        activeGroup,
        fuse,
        globalFrequencies,
        userFrequencies,
      ),
    [searchQuery, activeGroup, fuse, userFrequencies],
  );

  // Reset showAll when filters change
  useEffect(() => {
    setShowAll(false);
  }, [searchQuery, activeGroup]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisibleItems([]);
    setActiveIndex(0);

    const itemsToAnimate =
      searchQuery || showAll
        ? filteredResources
        : filteredResources.slice(0, 6);

    itemsToAnimate.forEach((_, index) => {
      timeoutRef.current = setTimeout(() => {
        setVisibleItems((prev) => [...prev, index]);
      }, index * 100);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [filteredResources, searchQuery, showAll]);

  const displayedResources = useMemo(() => {
    if (searchQuery || showAll) return filteredResources;
    return filteredResources.slice(0, 6);
  }, [filteredResources, searchQuery, showAll]);
  const resourceCount = filteredResources.length;

  const selectOptions = useMemo(
    () =>
      groups.map(({ value, labelRu }) => ({
        value,
        label: isRu ? labelRu : value,
      })),
    [isRu],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (displayedResources.length === 0) return;

      if (event.key === "Enter") {
        event.preventDefault();

        const frequencies = JSON.parse(
          localStorage.getItem("userFrequencies") || "{}",
        );
        frequencies[displayedResources[activeIndex].url] =
          (frequencies[displayedResources[activeIndex].url] || 0) + 1;
        localStorage.setItem("userFrequencies", JSON.stringify(frequencies));

        window.open(displayedResources[activeIndex].url, "_blank");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % displayedResources.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          prev === 0 ? displayedResources.length - 1 : prev - 1,
        );
      }
    },
    [displayedResources, activeIndex],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 pb-4 lg:flex-row">
        <h3 className="text-2xl font-medium sm:text-3xl lg:flex-4">
          <Trans>All University Services</Trans>
        </h3>
        <div className="grid items-center gap-4 md:grid-cols-2 md:gap-6 lg:flex lg:flex-1">
          <CustomSelect
            options={selectOptions}
            selectedValue={activeGroup}
            onChange={setActiveGroup}
            className="sm:block lg:hidden"
          />
          <SearchInput
            onKeyDown={handleKeyDown}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
      </div>

      <div className="flex min-h-[500px] flex-row-reverse items-start gap-6">
        {/* Category List */}
        <div className="hidden flex-1 lg:block">
          <h3 className="text-base-content text-lg font-semibold">
            <Trans>Filter</Trans>
          </h3>
          <div>
            {groups.map(({ value, labelRu }) => (
              <button
                type="button"
                key={value}
                onClick={() => setActiveGroup(value)}
                className={cn(
                  "block p-2",
                  activeGroup === value
                    ? "text-primary font-bold"
                    : "text-base-content/75",
                )}
              >
                {isRu ? labelRu : value}
              </button>
            ))}
          </div>
        </div>

        {displayedResources.length > 0 ? (
          <div className="grid flex-4 grid-cols-1 gap-5 lg:grid-cols-3">
            {displayedResources.map((resource, index) => {
              const resourceName = isRu
                ? resource.resourceRu
                : resource.resource;
              const title = isRu ? resource.titleRu : resource.title;
              const description = isRu
                ? resource.descriptionRu
                : resource.description;

              return (
                <a
                  onClick={() => {
                    const frequencies = JSON.parse(
                      localStorage.getItem("userFrequencies") || "{}",
                    );
                    frequencies[resource.url] =
                      (frequencies[resource.url] || 0) + 1;
                    localStorage.setItem(
                      "userFrequencies",
                      JSON.stringify(frequencies),
                    );
                  }}
                  href={resource.url}
                  target="_blank"
                  rel="nofollow noreferrer"
                  key={index}
                  className={cn(
                    "resource-item bg-base-200 hover:bg-base-300 rounded-box flex min-h-[100px] flex-row gap-4 px-4 py-4 transition-all ease-in-out",
                    visibleItems.includes(index) ? "visible" : "",
                    activeIndex === index && searchQuery
                      ? "ring-primary ring-3"
                      : "",
                  )}
                >
                  <span
                    className={cn(
                      resource.icon,
                      "text-primary hidden w-8 shrink-0 text-3xl sm:block",
                    )}
                  />
                  <div>
                    <p className="text-base-content flex text-lg font-semibold">
                      <span
                        className={cn(
                          resource.icon,
                          "text-primary mt-1 mr-2 shrink-0 text-xl sm:hidden",
                        )}
                      />
                      <span>
                        {resourceName}
                        {title && `: ${title}`}
                      </span>
                    </p>
                    <p className="text-base-content/75 text-sm">
                      {description}
                    </p>
                  </div>
                </a>
              );
            })}
            {!searchQuery && filteredResources.length > 6 && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="btn btn-ghost min-h-[100px] lg:col-span-3"
              >
                <Trans>Show all ({resourceCount})</Trans>
              </button>
            )}
            {!searchQuery && filteredResources.length > 6 && showAll && (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="btn btn-ghost min-h-[100px] lg:col-span-3"
              >
                <Trans>Collapse</Trans>
              </button>
            )}
          </div>
        ) : (
          <p className="text-base-content flex-4 text-lg">
            <Trans>No results found.</Trans>
          </p>
        )}
      </div>
    </div>
  );
};

export default Links;
