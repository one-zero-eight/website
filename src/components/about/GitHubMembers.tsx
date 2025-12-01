import { useGitHubMembers } from "@/components/about/hooks/useGitHubMembers";

export const GitHubMembers = () => {
  const {
    data: githubMembers,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useGitHubMembers();

  if (isLoadingMembers) {
    return (
      <div className="dark:bg-base-200 mt-8 rounded-lg bg-gray-100 p-4">
        <div className="flex items-center gap-4">
          <div className="flex animate-pulse gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 w-12 rounded-full"></div>
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
          {/* Unable to load GitHub members. Please try again later. */}
        </p>
      </div>
    );
  }

  if (!githubMembers || githubMembers.length === 0) {
    return (
      <div className="dark:bg-base-100 mt-8 rounded-lg bg-gray-100 p-4">
        <p className="text-gray-500 dark:text-gray-400">
          No public members found.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg p-4">
      {/* <h3 className="mb-4 text-center text-lg font-semibold text-black dark:text-white">
          Our GitHub Contributors
        </h3> */}
      <div className="flex flex-wrap justify-center gap-4">
        {githubMembers.map((member, index) => (
          <a
            key={member.id}
            href={member.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`animate-in slide-in-from-bottom-4 dark:bg-base-200 flex flex-col items-center rounded-lg bg-gray-200 p-3 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md delay-${100 + index * 50}`}
          >
            <img
              src={member.avatar_url}
              alt={member.login}
              className="mb-2 h-12 w-12 rounded-full border-2 border-gray-200 dark:border-gray-600"
              loading="lazy"
            />
            <span className="text-center text-sm font-medium text-gray-900 dark:text-gray-100">
              {member.login}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
