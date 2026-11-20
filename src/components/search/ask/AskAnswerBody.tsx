import "katex/dist/katex.min.css";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/** Models often write math as \(...\) and \[...\]; remark-math understands only $...$ and $$...$$. */
function normalizeMathDelimiters(text: string) {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, math: string) => `$$${math}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, math: string) => `$${math}$`);
}

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
};

type HastNode = {
  type: string;
  tagName?: string;
  properties?: { className?: string[]; ariaHidden?: string };
  value?: string;
  children?: HastNode[];
};

// Puts a small cat at the end of the text, inside its last line, so it moves with the text as it is written
function appendCat() {
  return (tree: HastNode) => {
    let node = tree;
    for (;;) {
      const last = node.children?.findLast(
        (child) => child.type !== "text" || child.value?.trim(),
      );
      const className = last?.properties?.className ?? [];
      if (
        last?.type !== "element" ||
        last.tagName === "pre" ||
        className.some((name) => name.includes("math"))
      )
        break;
      node = last;
    }
    node.children?.push({
      type: "element",
      tagName: "span",
      properties: {
        ariaHidden: "true",
        className: ["ml-1", "inline-block", "animate-pulse", "text-[0.85em]"],
      },
      children: [{ type: "text", value: "🐱" }],
    });
  };
}

export function AskAnswerBody({
  text,
  citationTargets,
  writing,
}: {
  text: string;
  citationTargets?: ReadonlyMap<number, string>;
  // The answer is still being written: a cat follows its end
  writing?: boolean;
}) {
  function linkCitations() {
    return (tree: MarkdownNode) => {
      function visit(node: MarkdownNode) {
        if (
          !node.children ||
          ["link", "linkReference", "code", "inlineCode", "html"].includes(
            node.type,
          )
        )
          return;
        node.children = node.children.flatMap((child) => {
          if (child.type !== "text" || !child.value) {
            visit(child);
            return [child];
          }
          const parts: MarkdownNode[] = [];
          let offset = 0;
          for (const match of child.value.matchAll(/\[(\d+(?:,\s*\d+)*)\]/g)) {
            const numbers = match[1].split(/,\s*/).map(Number);
            if (!numbers.every((number) => citationTargets?.has(number)))
              continue;
            parts.push({
              type: "text",
              value: child.value.slice(offset, match.index),
            });
            numbers.forEach((number, index) => {
              if (index) parts.push({ type: "text", value: ", " });
              parts.push({
                type: "link",
                url: `#${citationTargets!.get(number)}`,
                children: [{ type: "text", value: `[${number}]` }],
              });
            });
            offset = match.index + match[0].length;
          }
          parts.push({ type: "text", value: child.value.slice(offset) });
          return parts;
        });
      }
      visit(tree);
    };
  }
  return (
    <Markdown
      remarkPlugins={
        citationTargets
          ? [remarkGfm, remarkMath, linkCitations]
          : [remarkGfm, remarkMath]
      }
      rehypePlugins={writing ? [appendCat, rehypeKatex] : [rehypeKatex]}
      components={{
        a: ({ href, children }) =>
          href ? (
            <a
              href={href}
              target={href.startsWith("#") ? undefined : "_blank"}
              rel={href.startsWith("#") ? undefined : "noopener noreferrer"}
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
      {normalizeMathDelimiters(text)}
    </Markdown>
  );
}
