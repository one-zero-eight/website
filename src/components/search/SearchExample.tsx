import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type SearchExampleProps = {
  searchQueries: string[];
};

export function SearchExample({ searchQueries }: SearchExampleProps) {
  const [exampleIndex, setExampleIndex] = useState(() =>
    Math.floor(Math.random() * searchQueries.length),
  );
  const navigate = useNavigate();

  if (searchQueries.length === 0) return null;

  const example = searchQueries[exampleIndex];

  const handleSearch = () => {
    navigate({ to: "/search", search: { q: example } });
    if (searchQueries.length <= 1) return;
    setExampleIndex(
      (exampleIndex +
        1 +
        Math.floor(Math.random() * (searchQueries.length - 1))) %
        searchQueries.length,
    );
  };

  return (
    <p className="text-base-content/50 flex gap-2 text-sm">
      <Trans>
        Example:{" "}
        <a
          href="#"
          className="text-primary hover:underline"
          onClick={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          {example}
        </a>
      </Trans>
    </p>
  );
}
