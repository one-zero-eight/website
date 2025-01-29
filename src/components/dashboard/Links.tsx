import CustomSelect from "@/lib/links/customSelector";
import universityResources from "@/lib/links/universityResources";
import { useEffect, useRef, useState } from "react";

const Links = () => {
  const [activeGroup, setActiveGroup] = useState("Academic");
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset visible items
    setVisibleItems([]);

    // Add a delay before showing each item
    universityResources
      .filter((item) => activeGroup === item.category)
      .forEach((_, index) => {
        timeoutRef.current = setTimeout(() => {
          setVisibleItems((prev) => [...prev, index]);
        }, index * 100); // Delay each item by 100ms
      });

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeGroup]);
  const options = [
    { value: "Academic" },
    { value: "Financial" },
    { value: "Support" },
    { value: "Extracurricular" },
    { value: "Housing" },
    { value: "Transport" },
    { value: "Communication" },
    { value: "Navigation" },
  ];
  return (
    <div className="px-4 py-8">
      <div className="flex flex-col justify-around py-4 md:flex-row md:items-center md:justify-between">
        <h3 className="my-8 px-2 text-2xl font-medium sm:my-2 sm:text-3xl">
          All University Services
        </h3>
        <CustomSelect
          options={options}
          selectedValue={activeGroup}
          onChange={(value) => setActiveGroup(value)}
        />
      </div>
      <div className="flex min-h-[500px] items-start gap-6">
        {/* Resources Grid */}
        <div className="grid flex-[4] gap-5 md:grid-cols-2 lg:grid-cols-3">
          {universityResources
            .filter((item) => activeGroup === item.category)
            .map((resource, index) => (
              <a
                href={resource.url}
                target="_blank"
                key={index}
                className={`resource-item flex min-h-[100px] cursor-pointer flex-row gap-4 rounded-2xl bg-primary px-4 py-4 transition-all ease-in-out hover:bg-primary-hover ${
                  visibleItems.includes(index) ? "visible" : ""
                }`}
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
                    {resource.description && <p>{resource.description}</p>}
                  </p>
                </div>
              </a>
            ))}
        </div>

        {/* Category List */}
        <div className="hidden flex-1 lg:block">
          <h3 className="text-lg font-semibold text-contrast">
            Group of Services
          </h3>
          <ul>
            {[
              "Academic",
              "Financial",
              "Support",
              "Extracurricular",
              "Housing",
              "Transport",
              "Communication",
              "Navigation",
            ].map((category) => (
              <li
                key={category}
                onClick={() => setActiveGroup(category)}
                className={`cursor-pointer p-2 ${
                  activeGroup === category
                    ? "font-bold text-brand-violet"
                    : "text-contrast/75"
                }`}
              >
                {category}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Links;
