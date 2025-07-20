import { HTMLAttributes, PropsWithChildren } from "react";

export function Section({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className="prose prose-quoteless mx-4 max-w-none rounded-2xl bg-primary px-4 py-6 dark:prose-invert prose-img:rounded-2xl"
      {...props}
    >
      {children}
    </div>
  );
}
