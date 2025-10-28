import { HTMLAttributes, PropsWithChildren } from "react";

export function Section({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className="prose prose-quoteless bg-primary dark:prose-invert prose-img:rounded-2xl mx-4 max-w-none rounded-2xl px-4 py-6"
      {...props}
    >
      {children}
    </div>
  );
}
