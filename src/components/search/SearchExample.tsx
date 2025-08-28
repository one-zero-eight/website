import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type SearchExampleProps = {
  searchQueries: string[];
};

export function SearchExample({ searchQueries }: SearchExampleProps) {
  const [example, setExample] = useState(
    searchQueries[Math.floor(Math.random() * searchQueries.length)],
  );
  const navigate = useNavigate();

  if (searchQueries.length === 0) return null;

  const runSearch = (query: string) => {
    navigate({ to: "/search", search: { q: query } });
  };

  const setNewExample = () => {
    if (searchQueries.length <= 1) return;
    let newExample = example;

    while (newExample === example) {
      newExample =
        searchQueries[Math.floor(Math.random() * searchQueries.length)];
    }

    setExample(newExample);
  };

  return (
    <p className="text-muted-foreground flex gap-2 text-sm text-gray-600 dark:text-[#8A8A8A]">
      Example:{" "}
      <a
        href="#"
        className="text-brand-violet hover:underline"
        onClick={(e) => {
          e.preventDefault();
          runSearch(example);
          setNewExample();
        }}
      >
        {example}
      </a>
    </p>
  );
}
