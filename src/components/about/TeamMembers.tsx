import { useState } from "react";
import { useTeamMembers } from "./hooks/useTeamMembers";
import { MemberAvatar } from "./cards/MemberAvatar.tsx";

export function TeamMembers() {
  const {
    data: teamMembers,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useTeamMembers();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoadingMembers) {
    return (
      <div className="mt-8 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex animate-pulse gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600"
              ></div>
            ))}
          </div>
          <span className="text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Unable to load team members. Please try again later.
        </p>
      </div>
    );
  }

  if (!teamMembers || teamMembers.length === 0) {
    return (
      <div className="mt-8 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">
          No team members found.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-8 overflow-visible rounded-lg p-4">
      <div className="flex min-h-[200px] flex-wrap justify-center gap-4">
        {teamMembers.map((member, index) => (
          <div
            key={`${member.fullName}-${index}`}
            className={`animate-in slide-in-from-bottom-4 relative h-[110px] w-[110px] delay-${100 + index * 50}`}
            style={{
              zIndex: hoveredIndex === index ? 50 : 1,
              transition: `z-index 0s linear ${hoveredIndex === index ? "0s" : "0.3s"}`,
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={`dark:bg-base-200 dark:border-base-100 absolute top-0 left-0 flex min-h-full w-full flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out dark:border ${
                hoveredIndex === index
                  ? "dark:border-primary border-primary border-2 py-4 shadow-xl dark:border"
                  : "py-2 hover:shadow-md"
              }`}
            >
              <div className="flex w-full flex-col items-center justify-center">
                <div
                  className={`transition-all duration-300 ${hoveredIndex === index ? "mb-2 scale-110" : "mb-2"}`}
                >
                  <MemberAvatar member={member} />
                </div>
                <div className="px-1 text-center">
                  <h3
                    className={`line-clamp-2 font-medium text-gray-900 transition-all duration-300 dark:text-gray-100 ${hoveredIndex === index ? "text-sm" : "text-xs"}`}
                  >
                    {member.fullName}
                  </h3>
                </div>
              </div>

              <div
                className={`grid w-full px-2 transition-all duration-500 ease-in-out ${hoveredIndex === index ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden">
                  <div className="flex justify-center gap-2">
                    {member.github && (
                      <a
                        href={`https://github.com/${member.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        title={`GitHub: @${member.github}`}
                      >
                        <span className="icon-[mdi--github] text-xl text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100" />
                      </a>
                    )}

                    {member.telegram && (
                      <a
                        href={`https://t.me/${member.telegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        title={`Telegram: @${member.telegram}`}
                      >
                        <span className="icon-[mdi--telegram] text-xl text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
