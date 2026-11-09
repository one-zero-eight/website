import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AskAnswerBody({ text }: { text: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) =>
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ) : (
            <>{children}</>
          ),
        p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
        pre: ({ children }) => (
          <pre className="max-w-full overflow-x-auto">{children}</pre>
        ),
        li: ({ children }) => <li className="ml-5 list-disc">{children}</li>,
      }}
    >
      {text}
    </Markdown>
  );
}
