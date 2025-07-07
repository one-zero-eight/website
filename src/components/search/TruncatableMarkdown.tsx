import { searchTypes } from "@/api/search";
import { useMemo } from "react";
import Markdown from "react-markdown";

const TruncatableMarkdown = ({
  text,
  sourse_type,
}: {
  text: string;
  sourse_type:
    | searchTypes.EduwikiSourceType
    | searchTypes.CampusLifeSourceType
    | searchTypes.HotelSourceType
    | searchTypes.MapsSourceType
    | searchTypes.MoodleFileSourceType
    | searchTypes.MoodleUrlSourceType
    | searchTypes.MoodleUnknownSourceType
    | searchTypes.TelegramSourceType
    | searchTypes.ResidentsSourceType;
}) => {
  const shouldTruncate = sourse_type !== "maps";

  const truncatedText = useMemo(() => {
    if (!shouldTruncate) return text;

    // Find first sentence that starts with #
    const match = text.match(/(^|\n)(?=#+ )/);

    if (match && match.index !== undefined) {
      return text.slice(0, match.index).trim();
    }

    // Return empty article if no titles
    const fallback = text.match(/[^#\s].+?(\n|$)/);
    return fallback ? fallback[0].trim() : text;
  }, [text, shouldTruncate]);

  return (
    <div className="text-muted-foreground w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs">
      <Markdown
        components={{
          p: ({ children }) => <span>{children}</span>,
          h1: ({ children }) => <span>{children}</span>,
          h2: ({ children }) => <span>{children}</span>,
          h3: ({ children }) => <span>{children}</span>,
          h4: ({ children }) => <span>{children}</span>,
          h5: ({ children }) => <span>{children}</span>,
          h6: ({ children }) => <span>{children}</span>,
        }}
      >
        {truncatedText}
      </Markdown>
    </div>
  );
};

export default TruncatableMarkdown;
