import { useNavigate } from "@tanstack/react-router";

type SearchExampleProps = {
  searchQueries: string[];
};

export function SearchExample({ searchQueries }: SearchExampleProps) {
  const navigate = useNavigate();
  if (searchQueries.length === 0) return null;

  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  const runSearch = (query: string) => {
    navigate({ to: "/search", search: { q: query } });
  };

  return (
    <p className="text-muted-foreground flex gap-2 text-sm text-gray-600 dark:text-[#8A8A8A]">
      Example:{" "}
      <a
        href="#"
        className="text-brand-violet hover:underline"
        onClick={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        {query}
      </a>
    </p>
  );
}
