import { HTMLAttributes, PropsWithChildren } from "react";

export function RulesSection({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className="prose prose-quoteless bg-base-200 dark:prose-invert prose-img:rounded-box rounded-box max-w-none px-4 py-6"
      {...props}
    >
      {children}
    </div>
  );
}
