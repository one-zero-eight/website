import React, { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

const TruncatableMarkdown = ({ text }: { text: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldTruncate, setShouldTruncate] = useState(true);

  useEffect(() => {
    if (containerRef.current) {
      const count = containerRef.current.childElementCount;
      setShouldTruncate(count === 1);
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`${
        shouldTruncate
          ? "max-w-full overflow-hidden truncate text-ellipsis whitespace-nowrap text-xs"
          : "flex max-w-full flex-col text-xs"
      } `}
    >
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
        {text}
      </Markdown>
    </div>
  );
};
export default TruncatableMarkdown;
