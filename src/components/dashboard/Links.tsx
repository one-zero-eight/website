import { groups } from "@/lib/links/constants";
import CustomSelect from "@/lib/links/customSelector";
import {
  globalFrequencies,
  resourcesList,
} from "@/lib/links/resources-list.ts";
import { SearchInput } from "@/lib/links/SearchInput";
import {
  createFuseInstance,
  getFilteredResources,
} from "@/lib/links/searchUtils";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const Links = () => {
  const [activeGroup, setActiveGroup] = useState("All");
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

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

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisibleItems([]);
    setActiveIndex(0);

    filteredResources.forEach((_, index) => {
      timeoutRef.current = setTimeout(() => {
        setVisibleItems((prev) => [...prev, index]);
      }, index * 100);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [filteredResources]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (filteredResources.length === 0) return;

      if (event.key === "Enter") {
        event.preventDefault();

        const frequencies = JSON.parse(
          localStorage.getItem("userFrequencies") || "{}",
        );
        frequencies[filteredResources[activeIndex].url] =
          (frequencies[filteredResources[activeIndex].url] || 0) + 1;
        localStorage.setItem("userFrequencies", JSON.stringify(frequencies));

        window.open(filteredResources[activeIndex].url, "_blank");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredResources.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          prev === 0 ? filteredResources.length - 1 : prev - 1,
        );
      }
    },
    [filteredResources, activeIndex],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 pb-4 lg:flex-row">
        <h3 className="xxl:flex-none text-2xl font-medium sm:text-3xl lg:flex-4">
          All University Services
        </h3>
        <div className="xxl:grid xxl:flex-auto xxl:grid-cols-2 grid items-center gap-4 md:grid-cols-2 md:gap-6 lg:flex lg:flex-1">
          <CustomSelect
            options={groups}
            selectedValue={activeGroup}
            onChange={setActiveGroup}
            className="xxl:block sm:block lg:hidden"
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
        <div className="xxl:hidden hidden flex-1 lg:block">
          <h3 className="text-contrast text-lg font-semibold">Filter</h3>
          <div>
            {groups.map(({ value }) => (
              <button
                type="button"
                key={value}
                onClick={() => setActiveGroup(value)}
                className={clsx(
                  "block p-2",
                  activeGroup === value
                    ? "text-brand-violet font-bold"
                    : "text-contrast/75",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {filteredResources.length > 0 ? (
          <div className="xxl:grid-cols-2 grid flex-4 grid-cols-1 gap-5 lg:grid-cols-3">
            {filteredResources.map((resource, index) => (
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
                className={clsx(
                  "resource-item bg-primary hover:bg-primary-hover flex min-h-[100px] flex-row gap-4 rounded-2xl px-4 py-4 transition-all ease-in-out",
                  visibleItems.includes(index) ? "visible" : "",
                  activeIndex === index && searchQuery
                    ? "ring-brand-violet ring-3"
                    : "",
                )}
              >
                <span
                  className={clsx(
                    resource.icon,
                    "text-brand-violet hidden w-8 shrink-0 text-3xl sm:block",
                  )}
                />
                <div>
                  <p className="text-contrast flex text-lg font-semibold">
                    <span
                      className={clsx(
                        resource.icon,
                        "text-brand-violet mt-1 mr-2 shrink-0 text-xl sm:hidden",
                      )}
                    />
                    <span>
                      {resource.resource}
                      {resource.title && `: ${resource.title}`}
                    </span>
                  </p>
                  <p className="text-contrast/75 text-sm">
                    {resource.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-contrast flex-4 text-lg">No results found.</p>
        )}
      </div>
    </div>
  );
};

export default Links;
