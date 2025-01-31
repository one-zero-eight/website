import { groups } from "@/lib/links/constants";
import CustomSelect from "@/lib/links/customSelector";
import { SearchInput } from "@/lib/links/SearchInput";
import universityResources from "@/lib/links/universityResources";
import clsx from "clsx";
import Fuse from "fuse.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const Links = () => {
  const [activeGroup, setActiveGroup] = useState("All");
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const fuse = useMemo(() => {
    return new Fuse(universityResources, {
      keys: ["title", "description"],
      threshold: 0.3,
    });
  }, [universityResources]);

  const filteredResources = useMemo(() => {
    if (searchQuery) {
      return fuse.search(searchQuery).map((result) => result.item);
    }
    return universityResources.filter(
      (item) => activeGroup === item.category || activeGroup === "All",
    );
  }, [searchQuery, activeGroup, fuse]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisibleItems([]);

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
        window.open(filteredResources[activeIndex].url, "_blank");
      } else if (event.key === "ArrowDown") {
        setActiveIndex((prev) => (prev + 1) % filteredResources.length);
      } else if (event.key === "ArrowUp") {
        setActiveIndex((prev) =>
          prev === 0 ? filteredResources.length - 1 : prev - 1,
        );
      }
    },
    [filteredResources, activeIndex],
  );

  return (
    <div
      className="px-4 py-8"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
    >
      <div className="flex flex-col gap-4 py-4 lg:flex-row">
        <h3 className="my-8 px-2 text-2xl font-medium sm:my-2 sm:text-3xl lg:flex-[4] xxl:flex-none">
          All University Services
        </h3>
        <div className="grid items-center gap-4 md:grid-cols-2 md:gap-6 lg:flex lg:flex-1 xxl:grid xxl:flex-auto xxl:grid-cols-2">
          <CustomSelect
            options={groups}
            selectedValue={activeGroup}
            onChange={setActiveGroup}
          />
          <SearchInput
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
      </div>

      <div className="flex min-h-[500px] flex-row-reverse items-start gap-6">
        {/* Category List */}
        <div className="hidden flex-1 lg:block xxl:hidden">
          <h3 className="text-lg font-semibold text-contrast">
            Group of Services
          </h3>
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

        <div className="grid flex-[4] grid-cols-1 gap-5 lg:grid-cols-3 xxl:grid-cols-2">
          {filteredResources.map((resource, index) => (
            <a
              href={resource.url}
              target="_blank"
              key={index}
              className={clsx(
                "resource-item flex min-h-[100px] cursor-pointer flex-row gap-4 rounded-2xl bg-primary px-4 py-4 transition-all ease-in-out hover:bg-primary-hover",
                visibleItems.includes(index) ? "visible" : "",
                activeIndex === index && searchQuery
                  ? "border-2 border-brand-violet"
                  : "",
              )}
            >
              <div className="w-8">
                <span
                  className={`text-3xl ${resource.icon} text-brand-violet`}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-contrast">
                  {resource.title}
                </h3>
                <p className="text-sm text-contrast/75">
                  {resource.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Links;
