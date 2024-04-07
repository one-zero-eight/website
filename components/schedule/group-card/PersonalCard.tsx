import { useRouter } from "next/navigation";

export type PersonalCardProps = {
  name: React.ReactNode;
  description: React.ReactNode;
  buttons?: React.ReactNode;
  pageUrl?: string;
  canHide?: boolean;
};

export function PersonalCard({
  name,
  description,
  buttons,
  pageUrl,
  canHide = false,
}: PersonalCardProps) {
  const router = useRouter();

  return (
    <div
      className="flex min-h-fit min-w-fit max-w-full basis-72 cursor-pointer flex-row items-center justify-between rounded-2xl bg-primary-main p-4 hover:bg-primary-hover"
      onClick={() => pageUrl && router.push(pageUrl)}
      onMouseEnter={() => pageUrl && router.prefetch(pageUrl)}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{name}</p>
        <p className="text-inactive">{description}</p>
      </div>
      <div className="flex select-none flex-row place-items-center">
        {/*{canHide && <HideButton groupId={group.id} />}*/}
        {buttons}
      </div>
    </div>
  );
}
