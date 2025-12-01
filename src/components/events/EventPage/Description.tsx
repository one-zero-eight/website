import { workshopsTypes } from "@/api/workshops";
import clsx from "clsx";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const processTextNode = (text: string): (string | React.JSX.Element)[] => {
  const result: (string | React.JSX.Element)[] = [];
  let buffer = "";

  for (let i = 0; i < text.length; i++) {
    const urlMatch = text.slice(i).match(/^https?:\/\/[^\s<>{}|\\^[\]`"()]+/i);
    if (urlMatch) {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      const url = urlMatch[0];
      result.push(
        <a
          className="text-primary hover:text-primary/80 break-all"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          key={`url-${i}`}
        >
          {url}
        </a>,
      );
      i += url.length - 1;
      continue;
    }
    const tgMatch = text.slice(i).match(/^@[a-zA-Z0-9_]{5,32}\b/);
    if (tgMatch) {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      const username = tgMatch[0];
      result.push(
        <a
          className="text-primary hover:text-primary/80 break-all"
          href={`https://t.me/${username.slice(1)}`}
          target="_blank"
          rel="noopener noreferrer"
          key={`tg-${i}`}
        >
          {username}
        </a>,
      );
      i += username.length - 1;
      continue;
    }
    buffer += text[i];
  }
  if (buffer) {
    result.push(buffer);
  }
  return result;
};

export function MarkdownWithCustomLinks({ children }: { children: string }) {
  // Функция для обработки различных типов children
  const processChildrenRecursively = (
    children: React.ReactNode,
  ): React.ReactNode => {
    if (typeof children === "string") {
      return processTextNode(children);
    }

    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === "string") {
          return (
            <React.Fragment key={index}>
              {processTextNode(child)}
            </React.Fragment>
          );
        }
        return child;
      });
    }

    return children;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Переопределяем рендеринг текстовых узлов для обработки URL и Telegram алиасов
        text: ({ children }) => {
          if (typeof children === "string") {
            return <>{processTextNode(children)}</>;
          }
          return <>{children}</>;
        },
        // Стилизация ссылок в markdown
        a: ({ href, children }) => (
          <a
            className="text-primary hover:text-primary/80 break-all"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {processChildrenRecursively(children)}
          </a>
        ),
        // Стилизация жирного текста с обработкой текста внутри
        strong: ({ children }) => (
          <strong className="font-bold">
            {processChildrenRecursively(children)}
          </strong>
        ),
        // Стилизация курсива с обработкой текста внутри
        em: ({ children }) => (
          <em className="italic">{processChildrenRecursively(children)}</em>
        ),
        // Стилизация параграфов
        p: ({ children }) => <p>{processChildrenRecursively(children)}</p>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export interface DescriptionProps {
  event: workshopsTypes.SchemaWorkshop;
  pageLanguage: string | null;
  className?: string;
}

export function Description({
  event,
  pageLanguage,
  className,
}: DescriptionProps) {
  const getEventDescription = (): string | null => {
    if (!pageLanguage)
      return event.english_description || event.russian_description;

    if (pageLanguage === "english") return event.english_description;
    else return event.russian_description;
  };

  return (
    <div className={clsx("card card-border", className)}>
      <div className="card-body">
        <span className="flex items-center gap-2 text-xl font-semibold">
          <span className="icon-[fluent--text-description-16-filled]" />
          Description
        </span>
        <div className="flex">
          <div className="prose dark:prose-invert">
            <MarkdownWithCustomLinks>
              {getEventDescription() || "## No Description"}
            </MarkdownWithCustomLinks>
          </div>
        </div>
      </div>
    </div>
  );
}
