export function GroupCardSkeleton() {
  return (
    <div className="skeleton flex min-h-fit max-w-full basis-72 flex-row items-center justify-between p-4">
      <div className="mb-0.5 flex flex-col gap-1">
        <div className="skeleton my-1 h-5 w-32 rounded-xl" />
        <div className="skeleton my-1 h-4 w-24 rounded-xl" />
      </div>
      <div className="flex flex-row place-items-center select-none">
        <div className="skeleton -mr-2 h-12 w-12" />
      </div>
    </div>
  );
}
