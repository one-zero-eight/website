import { HTMLAttributes, PropsWithChildren } from "react";

export function Section({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className="prose-quoteless prose max-w-none rounded-2xl bg-primary-main px-4 py-6 dark:prose-invert prose-img:rounded-2xl"
      {...props}
    >
      {children}
    </div>
  );
}
