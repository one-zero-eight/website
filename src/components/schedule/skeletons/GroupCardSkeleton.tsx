export function GroupCardSkeleton() {
  return (
    <div className="bg-base-200 rounded-box flex min-h-fit max-w-full basis-72 animate-pulse flex-row items-center justify-between p-4">
      <div className="mb-0.5 flex flex-col gap-1">
        <div className="bg-base-300 my-1 h-5 w-32 animate-pulse rounded-xl" />
        <div className="bg-base-300 my-1 h-4 w-24 animate-pulse rounded-xl" />
      </div>
      <div className="flex flex-row place-items-center select-none">
        <div className="bg-base-300 rounded-box -mr-2 h-12 w-12 animate-pulse" />
      </div>
    </div>
  );
}
