import { $search, searchTypes } from "@/api/search";
import { useEffect, useMemo, useState } from "react";
import CustomSelect from "../common/CustomSelector";
import PreviewCard from "./preview/PreviewCard";

// Types
type CoursesGroup = Record<string, string[]>;

interface ParsedCourse {
  id: number;
  trimester: string;
  engTitle: string;
  rusTitle: string;
  originalTitle: string;
}

interface CourseCardProps {
  course: ParsedCourse;
}

interface SearchControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Array<{ value: string }>;
  isPending: boolean;
  isSearching: boolean;
}

// Custom Hook for course data
function useCourseData() {
  const { data, isPending, error } = $search.useQuery(
    "get",
    "/moodle/courses/grouped-by-semester",
    {},
  );

  const coursesGroup = useMemo(() => (data ?? {}) as CoursesGroup, [data]);

  const categories = useMemo(
    () => [
      { value: "All" },
      ...Object.keys(coursesGroup).map((sem) => ({ value: sem })),
    ],
    [coursesGroup],
  );

  return { coursesGroup, categories, isPending, error };
}

const SearchControls = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  isPending,
  isSearching,
}: SearchControlsProps) => (
  <div className="flex flex-col gap-4 lg:flex-row">
    <div className="flex w-full flex-col gap-3 sm:flex-row lg:flex-1">
      <div className="relative flex-1">
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          disabled={isPending}
          className="h-12 w-full resize-none rounded-xl border-2 border-brand-violet/20 bg-pagebg p-4 pr-12 text-base caret-brand-violet outline-none transition-all duration-200 focus:border-brand-violet disabled:opacity-50 dark:text-white"
          placeholder="Search courses..."
        />
        <span className="icon-[material-symbols--search-rounded] absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-contrast/50" />
      </div>
      <button
        disabled={isPending || isSearching}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-violet px-6 text-base font-medium text-white shadow-lg transition-all duration-200 hover:bg-[#6600CC] hover:shadow-xl disabled:opacity-50 sm:w-auto"
      >
        {isPending || isSearching ? (
          <span className="icon-[material-symbols--sync] h-5 w-5 animate-spin" />
        ) : (
          <span className="icon-[material-symbols--search-rounded] h-5 w-5" />
        )}
        {isPending ? "Loading..." : isSearching ? "Searching..." : "Search"}
      </button>
    </div>
    <div className="flex w-full justify-end lg:w-auto">
      <CustomSelect
        selectedValue={selectedCategory}
        onChange={onCategoryChange}
        options={categories}
        className="w-full lg:w-[250px]"
      />
    </div>
  </div>
);

function useFilteredCourses(
  coursesGroup: CoursesGroup,
  selectedCategory: string,
  searchTerm: string,
) {
  return useMemo(() => {
    const trimesterGroups = Object.entries(coursesGroup).map(
      ([trimester, courses]) => {
        const parsedCourses = courses.map((raw, idx) => {
          const start = raw.indexOf("[");
          const trimmed = start >= 0 ? raw.slice(start) : raw;
          const [left, right] = trimmed.split(/\s*\/\s*/, 2);
          const m = left.match(/^\[(.*?)\]\s*(.*)$/) ?? [];

          return {
            id: idx,
            trimester: m[1]?.trim() || "",
            engTitle: m[2]?.trim() || "",
            rusTitle: (right || "").trim(),
            originalTitle: raw,
          };
        });

        return {
          trimester,
          courses: parsedCourses,
        };
      },
    );

    return trimesterGroups
      .filter(
        (group) =>
          selectedCategory === "All" || group.trimester === selectedCategory,
      )
      .map((group) => ({
        ...group,
        courses: group.courses.filter((course) => {
          const term = searchTerm.toLowerCase();
          return (
            course.engTitle.toLowerCase().includes(term) ||
            course.rusTitle.toLowerCase().includes(term)
          );
        }),
      }))
      .filter((group) => group.courses.length > 0);
  }, [coursesGroup, selectedCategory, searchTerm]);
}

const CourseCard = ({
  course,
  setPreviewSource,
  preview,
}: CourseCardProps & {
  preview: searchTypes.SchemaSearchResponse["source"] | undefined;
  setPreviewSource: (
    source: searchTypes.SchemaSearchResponse["source"],
  ) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: courseData, refetch } = $search.useQuery(
    "get",
    "/moodle/courses/by-course-fullname/content",
    {
      params: { query: { course_fullname: course.originalTitle } },
    },
    {
      enabled: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const onSelect = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await refetch();

      if (data && !isExpanded && !preview) {
        setPreviewSource(data[0]);
      }
      setIsExpanded(true);
    } catch (error) {
      console.error("Error fetching course content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div className="mb-3 rounded-xl border border-secondary-hover bg-floating transition-all duration-200 hover:border-brand-violet/30">
      <div
        className="flex cursor-pointer items-center gap-4 rounded-xl border-[1px] border-transparent p-4 transition-all duration-200 hover:bg-secondary-hover"
        onClick={() => onSelect()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} course ${course.engTitle || course.originalTitle}`}
      >
        <div className="flex-shrink-0">
          {isLoading ? (
            <span className="icon-[material-symbols--sync] animate-spin text-3xl text-brand-violet" />
          ) : (
            <span
              className={`${isExpanded ? "icon-[material-symbols--folder-open-rounded]" : "icon-[material-symbols--folder]"} text-3xl text-brand-violet transition-all duration-200`}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium">
            {course.engTitle || course.originalTitle}
          </h3>
          {course.rusTitle && (
            <p className="truncate text-sm text-contrast/75">
              {course.rusTitle}
            </p>
          )}
        </div>
        <span
          className={`icon-[material-symbols--chevron-${isExpanded ? "down" : "right"}] text-contrast/50 transition-transform duration-200`}
        />
      </div>
      {isExpanded && courseData && (
        <div className="rounded-b-xl border-t border-secondary-hover bg-pagebg/50 p-4">
          <div className="space-y-2">
            {courseData.map((source, index) => (
              <div
                onClick={() => setPreviewSource(source)}
                key={index}
                className="flex cursor-pointer gap-3 rounded-lg border-b border-secondary-hover p-3 transition-all duration-200 hover:bg-secondary-hover"
              >
                <span className="icon-[material-symbols--description] flex-shrink-0 text-2xl text-brand-violet" />
                <div className="min-w-0 flex-1 space-y-0">
                  <p className="truncate text-sm font-medium">
                    {source?.display_name || "Untitled"}
                  </p>
                  {source?.link && (
                    <a
                      href={source.link}
                      className="inline-block truncate text-xs text-gray-500 hover:text-blue-500"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// New component for trimester group
const TrimesterGroup = ({
  trimester,
  courses,
  setPreviewSource,
  preview,
}: {
  trimester: string;
  preview: searchTypes.SchemaSearchResponse["source"] | undefined;
  courses: ParsedCourse[];
  setPreviewSource: (
    source: searchTypes.SchemaSearchResponse["source"],
  ) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="rounded-xl border border-secondary-hover bg-floating p-4">
      <div
        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-all duration-200 focus:bg-secondary-hover focus:outline-none focus:ring-2 focus:ring-brand-violet/50"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} trimester ${trimester}`}
      >
        <span
          className={`${isExpanded ? "icon-[material-symbols--folder-open-rounded]" : "icon-[material-symbols--folder]"} text-3xl text-brand-violet transition-all duration-200`}
        />
        <div className="flex-1">
          <h2 className="text-xl font-semibold sm:text-2xl">{trimester}</h2>
          <p className="text-sm text-contrast/50">
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span
          className={`icon-[material-symbols--chevron-${isExpanded ? "down" : "right"}] text-contrast/50 transition-transform duration-200`}
        />
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-2">
          {courses.map((course) => (
            <CourseCard
              preview={preview}
              key={`card-${course.id}`}
              course={course}
              setPreviewSource={setPreviewSource}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="rounded-xl border border-secondary-hover bg-floating p-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded bg-contrast/20" />
          <div className="flex-1">
            <div className="h-6 w-32 animate-pulse rounded bg-contrast/20" />
            <div className="mt-1 h-4 w-24 animate-pulse rounded bg-contrast/20" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Main Component (updated for new layout)
export function CataloguePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [previewSource, setPreviewSource] =
    useState<searchTypes.SchemaSearchResponse["source"]>();
  const [showPreview, setShowPreview] = useState(false);

  const { coursesGroup, categories, isPending, error } = useCourseData();
  const trimesterGroups = useFilteredCourses(
    coursesGroup,
    selectedCategory,
    debouncedSearchTerm,
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-expand first group on mobile when no preview is shown
  useEffect(() => {
    if (trimesterGroups.length > 0 && !showPreview) {
      // Auto-expand logic can be added here if needed
    }
  }, [trimesterGroups, showPreview]);

  // Scroll to top when search results change
  useEffect(() => {
    const courseListElement = document.querySelector("[data-course-list]");
    if (courseListElement) {
      courseListElement.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [debouncedSearchTerm, selectedCategory]);

  // Handle preview close
  const handleClosePreview = () => {
    setPreviewSource(undefined);
    setShowPreview(false);
  };

  // Handle preview open
  const handleOpenPreview = (
    source: searchTypes.SchemaSearchResponse["source"],
  ) => {
    setPreviewSource(source);
    setShowPreview(true);
  };

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <span className="icon-[material-symbols--error-outline] text-6xl text-red-500" />
          <p className="mt-4 text-lg font-medium">Failed to load courses</p>
          <p className="text-contrast/75">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-4 sm:space-y-8">
      <SearchControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        isPending={isPending}
        isSearching={searchTerm !== debouncedSearchTerm}
      />

      {/* Mobile Preview Overlay */}
      {showPreview && previewSource && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
          <div className="absolute inset-4 bottom-4 top-4 overflow-hidden rounded-xl bg-pagebg">
            <PreviewCard source={previewSource} onClose={handleClosePreview} />
          </div>
        </div>
      )}

      <div className="flex w-full gap-4 lg:gap-6">
        {/* Course List */}
        <div
          className="flex max-h-[calc(100vh-200px)] w-full flex-col gap-6 overflow-y-auto lg:w-1/2 lg:max-w-[600px]"
          data-course-list
        >
          {isPending ? (
            <LoadingSkeleton />
          ) : trimesterGroups.length > 0 ? (
            trimesterGroups.map((group) => (
              <TrimesterGroup
                preview={previewSource}
                setPreviewSource={handleOpenPreview}
                key={group.trimester}
                trimester={group.trimester}
                courses={group.courses}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-contrast/50">
              <span className="icon-[material-symbols--search-off] text-6xl" />
              <p className="mt-4 text-xl font-medium">No courses found</p>
              <p className="text-center text-sm">
                Try adjusting your search terms or category filter
              </p>
            </div>
          )}
        </div>

        {/* Desktop Preview */}
        <div className="hidden w-1/2 flex-1 lg:block">
          {previewSource ? (
            <div className="sticky top-4">
              <PreviewCard
                source={previewSource}
                onClose={handleClosePreview}
              />
            </div>
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-contrast/20">
              <div className="text-center text-contrast/50">
                <span className="icon-[material-symbols--preview] text-6xl" />
                <p className="mt-4 text-lg font-medium">Select a course</p>
                <p className="text-sm">
                  Choose a course from the list to preview its content
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
