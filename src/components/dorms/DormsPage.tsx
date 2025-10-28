export function DormsPage() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4">
      <div className="flex flex-col gap-4">
        <div className="group bg-primary flex flex-row gap-4 rounded-2xl px-4 py-6">
          <div className="w-12">
            <span className="icon-[material-symbols--quick-reference-outline-rounded] text-brand-violet text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-contrast flex items-center text-2xl font-semibold">
              What is it?
            </p>
            <p className="text-contrast/75 text-lg">
              InNoHassle Dorms bot is a tool for managing tasks, duties, and
              rules in your dormitory room. It helps you to split duties between
              roommates and track them.
            </p>
            <p className="text-contrast flex items-center text-2xl font-semibold">
              Features:
            </p>
            <p className="text-contrast text-lg">
              ✉️{" "}
              <span className="text-contrast/75">
                Invite your roommates to join the room
              </span>
            </p>
            <p className="text-contrast text-lg">
              📅{" "}
              <span className="text-contrast/75">
                Create regular or manual tasks
              </span>
            </p>
            <p className="text-contrast text-lg">
              📜{" "}
              <span className="text-contrast/75">
                Define rules for your room
              </span>
            </p>
          </div>
        </div>
        <a
          href="https://t.me/IURoomsBot"
          target="_blank"
          className="group bg-primary hover:bg-secondary flex flex-row gap-4 rounded-2xl px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[mdi--robot-excited-outline] text-brand-violet text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-contrast flex items-center text-2xl font-semibold">
              Telegram bot
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-contrast/75 text-lg">
              Create your room in the bot and invite your roommates to join.
            </p>
          </div>
        </a>
        <a
          href="https://t.me/maximf3"
          target="_blank"
          className="group bg-primary hover:bg-secondary flex flex-row gap-4 rounded-2xl px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[ic--baseline-telegram] text-brand-violet text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-contrast flex items-center text-2xl font-semibold">
              Contact us
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-contrast/75 text-lg">
              If you have any questions or suggestions, feel free to contact the
              developers.
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
