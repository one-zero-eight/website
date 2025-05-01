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
      className="flex min-h-fit min-w-fit max-w-full basis-72 cursor-pointer flex-row items-center justify-between rounded-2xl bg-primary p-4 hover:bg-primary-hover"
      onClick={() => pageUrl && navigate({ to: pageUrl })}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">{name}</p>
        <p className="text-inactive">{description}</p>
      </div>
      <div className="flex select-none flex-row place-items-center">
        {canHide && <HideButtonPersonal target={targetType} />}
        {buttons}
      </div>
    </div>
  );
}
