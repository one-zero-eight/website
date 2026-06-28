import { cn } from "@/lib/ui/cn";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { EditorImageHandlers } from "@/components/editor/types";

const DescriptionEditorTiptap = lazy(
  () => import("./_TiptapDescriptionEditor"),
);

export function DescriptionViewer({
  content,
  className,
  imageHandlers,
}: {
  content?: string | any; // Can be JSON string or JSON object
  className?: string;
  imageHandlers?: EditorImageHandlers;
}) {
  // Parse JSON string to object if needed
  const jsonContent =
    typeof content === "string"
      ? content
        ? JSON.parse(content)
        : null
      : content;

  if (!jsonContent) {
    return (
      <div className={cn("text-base-content/50 italic", className)}>
        No description available.
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className={className}>
          <i>Some error occurred</i>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className={className}>
            <span className="loading" />
          </div>
        }
      >
        <DescriptionEditorTiptap
          isReadOnly={true}
          initialContent={jsonContent}
          className={className}
          imageHandlers={imageHandlers}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
