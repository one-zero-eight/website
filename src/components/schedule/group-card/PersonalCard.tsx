import { useNavigate } from "@tanstack/react-router";
import { PathsUsersMeTargetHidePostParametersPathTarget as Type } from "@/api/events/types.ts";
import HideButtonPersonal from "@/components/schedule/personal-card/HideButtonPersonal.tsx";

export type PersonalCardProps = {
  name: React.ReactNode;
  description: React.ReactNode;
  targetType: Type;
  buttons?: React.ReactNode;
  pageUrl?: string;
  canHide?: boolean;
};

export function PersonalCard({
  name,
  description,
  buttons,
  pageUrl,
  targetType,
  canHide = true,
}: PersonalCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className="bg-primary hover:bg-primary-hover flex min-h-fit max-w-full min-w-fit basis-72 cursor-pointer flex-row items-center justify-between rounded-2xl p-4"
      onClick={() => pageUrl && navigate({ to: pageUrl })}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{name}</p>
        <p className="text-inactive">{description}</p>
      </div>
      <div className="flex flex-row place-items-center select-none">
        {canHide && <HideButtonPersonal target={targetType} />}
        {buttons}
      </div>
    </div>
  );
}
