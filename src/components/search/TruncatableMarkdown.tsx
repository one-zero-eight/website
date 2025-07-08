import { searchTypes } from "@/api/search";
import { useMemo } from "react";
import Markdown from "react-markdown";

const TruncatableMarkdown = ({
  text,
  sourse_type,
}: {
  text: string;
  gisourse_type:
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

    const titleMatch = text.match(/(^|\n)(?=#+ )/);
    if (titleMatch && titleMatch.index !== undefined) {
      const slice = text.slice(0, titleMatch.index).trim();
      if (slice) return slice;
    }

    const fallbackLine = text
      .split("\n")
      .find((line) => line.trim() && !line.trim().startsWith("#"));

    return fallbackLine ? fallbackLine.trim() : text;
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
