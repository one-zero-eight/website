import { GroupCardSkeleton } from "@/components/schedule/skeletons/GroupCardSkeleton";

export function GroupCardTagSkeleton() {
  return (
    <>
      <div className="my-4 flex w-full flex-wrap justify-between">
        <div className="bg-base-200 h-9 w-32 animate-pulse rounded-xl" />
        <div className="bg-base-200 mt-2 flex h-6 w-20 animate-pulse items-center rounded-xl" />
      </div>
      <div className="mb-4 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
        {Array(12)
          .fill(0)
          .map((_, i) => (
            <GroupCardSkeleton key={i} />
          ))}
      </div>
    </>
  );
}
