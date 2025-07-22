import { groups } from "@/lib/links/constants";
// import CustomSelect from "@/lib/links/customSelector";
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
import CustomSelect from "../common/CustomSelector";

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
        <h3 className="text-2xl font-medium sm:text-3xl lg:flex-[4] xxl:flex-none">
          All University Services
        </h3>
        <div className="grid items-center gap-4 md:grid-cols-2 md:gap-6 lg:flex lg:flex-1 xxl:grid xxl:flex-auto xxl:grid-cols-2">
          <CustomSelect
            options={groups}
            selectedValue={activeGroup}
            onChange={setActiveGroup}
            className="sm:block lg:hidden xxl:block"
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
        <div className="hidden flex-1 lg:block xxl:hidden">
          <h3 className="text-lg font-semibold text-contrast">Filter</h3>
          <div>
            {groups.map(({ value }) => (
              <button
                type="button"
                key={value}
                onClick={() => setActiveGroup(value)}
                className={clsx(
                  "block p-2",
                  activeGroup === value
                    ? "font-bold text-brand-violet"
                    : "text-contrast/75",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {filteredResources.length > 0 ? (
          <div className="grid flex-[4] grid-cols-1 gap-5 lg:grid-cols-3 xxl:grid-cols-2">
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
                  "resource-item flex min-h-[100px] flex-row gap-4 rounded-2xl bg-primary px-4 py-4 transition-all ease-in-out hover:bg-primary-hover",
                  visibleItems.includes(index) ? "visible" : "",
                  activeIndex === index && searchQuery
                    ? "ring ring-brand-violet"
                    : "",
                )}
              >
                <span
                  className={clsx(
                    resource.icon,
                    "hidden w-8 shrink-0 text-3xl text-brand-violet sm:block",
                  )}
                />
                <div>
                  <p className="flex text-lg font-semibold text-contrast">
                    <span
                      className={clsx(
                        resource.icon,
                        "mr-2 mt-1 shrink-0 text-xl text-brand-violet sm:hidden",
                      )}
                    />
                    <span>
                      {resource.resource}
                      {resource.title && `: ${resource.title}`}
                    </span>
                  </p>
                  <p className="text-sm text-contrast/75">
                    {resource.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="flex-[4] text-lg text-contrast">No results found.</p>
        )}
      </div>
    </div>
  );
};

export default Links;
