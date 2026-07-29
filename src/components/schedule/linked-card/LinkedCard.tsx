import { useNavigate } from "@tanstack/react-router";
import RemoveButtonLinked from "@/components/schedule/linked-card/RemoveButtonLinked.tsx";
import HideButtonLinked from "@/components/schedule/linked-card/HideButtonLinked.tsx";

export type LinkedCardProps = {
  name: React.ReactNode;
  alias: string;
  description: React.ReactNode;
  pageUrl?: string;
  canHide?: boolean;
};

export function LinkedCard({
  name,
  alias,
  description,
  pageUrl,
}: LinkedCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className="bg-base-200 hover:bg-base-300 rounded-box flex min-h-fit max-w-full min-w-fit basis-72 cursor-pointer flex-row items-center justify-between p-4"
      onClick={() => pageUrl && navigate({ to: pageUrl })}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{name}</p>
        <p className="text-base-content/30">{description}</p>
      </div>
      <div className="flex flex-row place-items-center select-none">
        <HideButtonLinked alias={alias} />
        <RemoveButtonLinked alias={alias} />
      </div>
    </div>
  );
}
