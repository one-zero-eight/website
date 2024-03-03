import { GroupCardSkeleton } from "@/components/schedule/skeletons/GroupCardSkeleton";
import React from "react";

export function GroupCardTagSkeleton() {
  const els = Array(12).fill(crypto.randomUUID());
  return (
    <React.Fragment key={`loading-gctag-${crypto.randomUUID()}`}>
      <div className="my-4 flex w-full flex-wrap justify-between">
        <div className="h-9 w-32 animate-pulse rounded-xl bg-primary-main" />
        <div className="mt-2 flex h-6 w-20 animate-pulse items-center rounded-xl bg-primary-main" />
      </div>
      <div className="mb-4 grid w-full grid-cols-1 gap-4 @lg/content:grid-cols-2 @4xl/content:grid-cols-3 @5xl/content:grid-cols-4">
        {els.map((el) => (
          <GroupCardSkeleton key={`loading-gc-${el}`} />
        ))}
      </div>
    </React.Fragment>
  );
}
