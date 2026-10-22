import { Trans, useLingui } from "@lingui/react/macro";

export function DormsPage() {
  const { t } = useLingui();

  return (
    <div className="grid grid-cols-1 gap-4 p-4">
      <div className="flex flex-col gap-4">
        <div className="group bg-base-200 rounded-box flex flex-row gap-4 px-4 py-6">
          <div className="w-12">
            <span className="icon-[material-symbols--quick-reference-outline-rounded] text-primary text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              <Trans>What is it?</Trans>
            </p>
            <p className="text-base-content/75 text-lg">
              {t`InNoHassle Dorms bot is a tool for managing tasks, duties, and rules in your dormitory room. It helps you to split duties between roommates and track them.`}
            </p>
            <p className="text-base-content flex items-center text-2xl font-semibold">
              <Trans>Features:</Trans>
            </p>
            <p className="text-base-content text-lg">
              ✉️{" "}
              <span className="text-base-content/75">
                <Trans>Invite your roommates to join the room</Trans>
              </span>
            </p>
            <p className="text-base-content text-lg">
              📅{" "}
              <span className="text-base-content/75">
                <Trans>Create regular or manual tasks</Trans>
              </span>
            </p>
            <p className="text-base-content text-lg">
              📜{" "}
              <span className="text-base-content/75">
                <Trans>Define rules for your room</Trans>
              </span>
            </p>
          </div>
        </div>
        <a
          href="https://telegram.me/IURoomsBot"
          target="_blank"
          className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[mdi--robot-excited-outline] text-primary text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              <Trans>Telegram bot</Trans>
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-base-content/75 text-lg">
              <Trans>
                Create your room in the bot and invite your roommates to join.
              </Trans>
            </p>
          </div>
        </a>
        <a
          href="https://telegram.me/maximf3"
          target="_blank"
          className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[ic--baseline-telegram] text-primary text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              <Trans>Contact us</Trans>
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-base-content/75 text-lg">
              {t`If you have any questions or suggestions, feel free to contact the developers.`}
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
