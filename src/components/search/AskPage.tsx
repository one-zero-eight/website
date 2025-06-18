import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import SearchField from "@/components/search/SearchField.tsx";
import { useNavigate } from "@tanstack/react-router";

export function AskPage({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const { me } = useMe();

  const runSearch = (query: string) => {
    navigate({ to: "/ask", search: { q: query } });
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <SearchField runSearch={runSearch} currentQuery={searchQuery} />
      <p>This page is under development.</p>
    </div>
  );
}
