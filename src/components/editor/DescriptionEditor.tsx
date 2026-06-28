import { ComponentProps, lazy, Suspense, forwardRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { TiptapEditorRef } from "./_TiptapDescriptionEditor";

const DescriptionEditorTiptap = lazy(
  () => import("./_TiptapDescriptionEditor"),
);

export const DescriptionEditor = forwardRef(function DescriptionEditor(
  props: ComponentProps<typeof DescriptionEditorTiptap>,
  ref: React.Ref<TiptapEditorRef>,
) {
  return (
    <ErrorBoundary
      fallback={
        <div className={props.className}>
          <i>Some error occurred</i>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className={props.className}>
            <span className="loading" />
          </div>
        }
      >
        <DescriptionEditorTiptap ref={ref} {...props} />
      </Suspense>
    </ErrorBoundary>
  );
});
