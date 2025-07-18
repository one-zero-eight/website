import { searchTypes } from "@/api/search";
import { useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TruncatableMarkdown = ({
  text,
  sourse_type,
  isSelected,
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
    | searchTypes.ResidentsSourceType
    | searchTypes.ResourcesSourceType;
  isSelected: boolean;
}) => {
  const shouldTruncate = sourse_type !== "maps";

  const processedText = useMemo(() => {
    // Convert phone number links to plain text format
    const processed = text.replace(
      /\[Phone number\s*([^\]]+)\]\(tel:([^)]+)\)/gi,
      (match, displayText, _phoneNumber) => {
        return `Tel: ${displayText.trim()}`;
      },
    );

    if (!shouldTruncate) return processed;

    // Truncation logic
    const titleMatch = processed.match(/(^|\n)(?=#+ )/);
    if (titleMatch && titleMatch.index !== undefined) {
      const slice = processed.slice(0, titleMatch.index).trim();
      if (slice) return slice;
    }

    const fallbackLine = processed
      .split("\n")
      .find((line) => line.trim() && !line.trim().startsWith("#"));

    return fallbackLine ? fallbackLine.trim() : processed;
  }, [text, shouldTruncate]);

  return (
    <div
      className={`text-muted-foreground w-full overflow-hidden text-xs ${isSelected ? "" : "line-clamp-2"}`}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <span>{children}</span>,
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          h1: ({ children }) => <span>{children}</span>,
          h2: ({ children }) => <span>{children}</span>,
          h3: ({ children }) => <span>{children}</span>,
          h4: ({ children }) => <span>{children}</span>,
          h5: ({ children }) => <span>{children}</span>,
          h6: ({ children }) => <span>{children}</span>,
          li: ({ children }) => <li className="ml-5 list-disc">{children}</li>,
        }}
      >
        {processedText}
      </Markdown>
    </div>
  );
};

export default TruncatableMarkdown;
