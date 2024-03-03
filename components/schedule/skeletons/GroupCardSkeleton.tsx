import React from "react";

export function GroupCardSkeleton() {
  return (
    <div className="flex min-h-fit max-w-full basis-72 animate-pulse flex-row items-center justify-between rounded-2xl bg-primary-main p-4">
      <div className="mb-0.5 flex flex-col gap-1">
        <div className="my-1 h-5 w-32 animate-pulse rounded-xl bg-secondary-main" />
        <div className="my-1 h-4 w-24 animate-pulse rounded-xl bg-secondary-main" />
      </div>
      <div className="flex select-none flex-row place-items-center">
        <div className="-mr-2 h-52 w-52 animate-pulse rounded-2xl bg-secondary-main" />
      </div>
    </div>
  );
}
