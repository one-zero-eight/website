import { useQuery } from "@tanstack/react-query";

interface GitHubMember {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

const GITHUB_ORG = "one-zero-eight";

export const useGitHubMembers = () => {
  return useQuery({
    queryKey: ["github-members", GITHUB_ORG],
    queryFn: async (): Promise<GitHubMember[]> => {
      const response = await fetch(
        `https://api.github.com/orgs/${GITHUB_ORG}/public_members`,
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
  });
};
