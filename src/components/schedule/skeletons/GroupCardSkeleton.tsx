export function GroupCardSkeleton() {
  return (
    <div className="bg-primary flex min-h-fit max-w-full basis-72 animate-pulse flex-row items-center justify-between rounded-2xl p-4">
      <div className="mb-0.5 flex flex-col gap-1">
        <div className="bg-secondary my-1 h-5 w-32 animate-pulse rounded-xl" />
        <div className="bg-secondary my-1 h-4 w-24 animate-pulse rounded-xl" />
      </div>
      <div className="flex flex-row place-items-center select-none">
        <div className="bg-secondary -mr-2 h-12 w-12 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}
