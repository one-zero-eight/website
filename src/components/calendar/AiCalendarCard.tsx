import HideButtonUI from "@/components/schedule/HideButtonUI.tsx";
import LinkIconButton from "@/components/schedule/group-card/LinkIconButton.tsx";
import SimpleExportButton from "@/components/schedule/group-card/SimpleExportButton.tsx";
import { Trans, useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useAiCalendarHidden } from "./ai-calendar";

// The card of AI Calendar among the personal calendars: show or hide it in the calendar, go to the assistant
export function AiCalendarCard({
  exportButtonOnClick,
}: {
  exportButtonOnClick?: () => void;
}) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [isHidden, setIsHidden] = useAiCalendarHidden();

  return (
    <div
      className="bg-base-200 hover:bg-base-300 rounded-box flex min-h-fit max-w-full min-w-fit basis-72 cursor-pointer flex-row items-center justify-between p-4"
      onClick={() => navigate({ to: "/search/ask" })}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xl font-medium">
          <Trans>AI Calendar</Trans>
        </p>
        <p className="text-base-content/30">
          <Trans>Events you added under the assistant's answers</Trans>
        </p>
      </div>
      <div className="flex flex-row place-items-center select-none">
        <SimpleExportButton onClick={exportButtonOnClick} />
        <HideButtonUI
          isHidden={isHidden}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsHidden(!isHidden);
          }}
        />
        <LinkIconButton
          href="/search/ask"
          icon={
            <span className="icon-[material-symbols--auto-awesome-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
          }
          tooltip={t`Ask the assistant`}
        />
      </div>
    </div>
  );
}
