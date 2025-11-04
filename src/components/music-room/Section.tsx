import { HTMLAttributes, PropsWithChildren } from "react";

export function Section({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className="prose prose-quoteless bg-inh-primary dark:prose-invert prose-img:rounded-box rounded-box mx-4 max-w-none px-4 py-6"
      {...props}
    >
      {children}
    </div>
  );
}
