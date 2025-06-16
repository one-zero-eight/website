import { $search, searchTypes } from "@/api/search";
import { useEffect, useMemo, useState } from "react";
import CustomSelect from "../common/customSelector";
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
}: SearchControlsProps) => (
  <div className="flex flex-col gap-4 md:flex-row">
    <div className="flex w-full flex-col gap-[10px] md:flex-1 md:flex-row">
      <input
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="h-10 w-full resize-none rounded-lg border-2 border-brand-violet bg-pagebg p-3 text-base caret-brand-violet outline-none dark:text-white md:w-[50%]"
        placeholder="Search services..."
      />
      <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-violet px-2 py-1 text-base font-normal leading-6 text-white shadow-[0px-0px-4px-#00000040] hover:bg-[#6600CC] md:w-[93px]">
        <span className="icon-[material-symbols--search-rounded] h-4 w-4" />
        Search
      </button>
    </div>
    <div className="flex w-full flex-1 justify-end">
      <CustomSelect
        selectedValue={selectedCategory}
        onChange={onCategoryChange}
        options={categories}
        className="w-[300px]"
      />
    </div>
  </div>
);

// Custom Hook for filtered courses (updated to maintain grouping)
function useFilteredCourses(
  coursesGroup: CoursesGroup,
  selectedCategory: string,
  searchTerm: string,
) {
  return useMemo(() => {
    // Get all courses grouped by trimester
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

    // Filter based on selected category and search term
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
      .filter((group) => group.courses.length > 0); // Remove empty groups
  }, [coursesGroup, selectedCategory, searchTerm]);
}

// Updated CourseCard component for list view
const CourseCard = ({
  course,
  setPreviewSource,
}: CourseCardProps & {
  setPreviewSource: (
    source: searchTypes.SchemaSearchResponse["source"],
  ) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: searchResult, refetch } = $search.useQuery(
    "get",
    "/search/search",
    {
      params: { query: { query: course.originalTitle } },
    },
    {
      enabled: false, // Disabled by default, we'll trigger manually
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
    try {
      // Manually trigger the query when clicked
      const { data } = await refetch();

      if (data?.responses?.[0]?.source && !isExpanded) {
        setPreviewSource(data.responses[0].source);
      }
      console.log(data);
      setIsExpanded(true); // Expand to show results
    } catch (error) {
      console.error("Error fetching course content:", error);
    }
  };

  return (
    <div className="mb-2 rounded-lg">
      <div
        className="flex cursor-pointer items-center gap-4 rounded-lg p-3 hover:bg-secondary-hover"
        onClick={() => onSelect(course.originalTitle)}
      >
        <span
          className={`${isExpanded ? "icon-[material-symbols--folder-open-rounded]" : "icon-[material-symbols--folder]"} text-4xl text-brand-violet`}
        />
        <div className="flex-1">
          <h3 className="text-base font-medium">{course.engTitle}</h3>
          <p className="text-sm text-contrast/75">{course.rusTitle}</p>
        </div>
        <span
          className={`icon-[material-symbols--chevron-${isExpanded ? "down" : "right"}] text-contrast/50`}
        />
      </div>
      {isExpanded && searchResult && (
        <div className="p-3 pl-8">
          {searchResult.responses.map((response, index) => (
            <div
              key={index}
              className="flex gap-3 rounded-lg p-2 hover:bg-secondary-hover"
            >
              <span className="icon-[material-symbols--description] bg-brand-violet text-3xl" />
              <div className="flex-1">
                <p className="text-md font-medium">
                  {response.source?.display_name || "Untitled"}
                </p>
                <a
                  href={response.source?.link}
                  className="text-sm text-gray-500 hover:text-blue-500"
                >
                  {response.source?.link || ""}
                </a>
              </div>
            </div>
          ))}
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
}: {
  trimester: string;
  courses: ParsedCourse[];
  setPreviewSource: (
    source: searchTypes.SchemaSearchResponse["source"],
  ) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="">
      <div
        className="flex cursor-pointer items-center gap-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* <span className="icon-[material-symbols--folder-open-rounded] text-4xl text-brand-violet"></span> */}
        <span
          className={`${isExpanded ? "icon-[material-symbols--folder-open-rounded]" : "icon-[material-symbols--folder]"} text-4xl text-brand-violet`}
        />
        <h2 className="text-2xl font-semibold">{trimester}</h2>
        <span className="text-sm text-contrast/50">
          {courses.length} courses
        </span>
      </div>
      {isExpanded && (
        <div className="space-y-2 pl-8">
          {courses.map((course) => (
            <CourseCard
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

// Main Component (updated for new layout)
export function CataloguePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [previewSource, setPreviewSource] =
    useState<searchTypes.SchemaSearchResponse["source"]>();
  const { coursesGroup, categories, isPending, error } = useCourseData();
  const trimesterGroups = useFilteredCourses(
    coursesGroup,
    selectedCategory,
    searchTerm,
  );
  useEffect(() => {
    if (trimesterGroups.length > 0 && trimesterGroups[0].courses.length > 0) {
      // You might need to fetch the content for the first course here
      // or modify your data flow to include initial content
    }
  }, [trimesterGroups]);

  if (error) return <div>Error</div>;
  if (isPending) return <div>Loading...</div>;

  return (
    <div className="space-y-11 px-4 py-4">
      <SearchControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
      />

      <div className="flex w-full gap-4">
        <div className="flex max-h-[calc(100vh-200px)] w-1/2 max-w-[1200px] flex-1 flex-col gap-[30px] overflow-y-auto">
          <div className="flex flex-col gap-6">
            {trimesterGroups.length > 0 ? (
              trimesterGroups.map((group) => (
                <TrimesterGroup
                  setPreviewSource={setPreviewSource}
                  key={group.trimester}
                  trimester={group.trimester}
                  courses={group.courses}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-contrast/50">
                <span className="icon-[material-symbols--search-off] text-4xl" />
                <p className="mt-2 text-lg">No courses found</p>
              </div>
            )}
          </div>
        </div>
        <div className="w-1/2 flex-1">
          {previewSource && (
            <PreviewCard
              source={previewSource}
              onClose={() => setPreviewSource(undefined)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
