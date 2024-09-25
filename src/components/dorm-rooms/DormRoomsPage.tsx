export function DormRoomsPage() {
  return (
    <div className="my-4 grid grid-cols-1 gap-4">
      <div className="flex flex-col gap-4">
        <div className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6">
          <div className="w-12">
            <span className="icon-[material-symbols--quick-reference-outline-rounded] text-5xl text-[#9747FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-text-main">
              What is it?
            </p>
            <p className="text-lg text-text-secondary/75">
              InNoHassle Rooms bot is a tool for managing tasks, duties, and
              rules in your dormitory room. It helps you to split duties between
              roommates and track them.
            </p>
            <p className="flex items-center text-2xl font-semibold text-text-main">
              Features:
            </p>
            <p className="text-lg text-text-secondary">
              ✉️{" "}
              <span className="text-text-secondary/75">
                Invite your roommates to join the room
              </span>
            </p>
            <p className="text-lg text-text-secondary">
              📅{" "}
              <span className="text-text-secondary/75">
                Create regular or manual tasks
              </span>
            </p>
            <p className="text-lg text-text-secondary">
              📜{" "}
              <span className="text-text-secondary/75">
                Define rules for your room
              </span>
            </p>
          </div>
        </div>
        <a
          href="https://t.me/IURoomsBot"
          target="_blank"
          className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
        >
          <div className="w-12">
            <span className="icon-[mdi--robot-excited-outline] text-5xl text-[#9747FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-text-main">
              Telegram bot
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-lg text-text-secondary/75">
              Create your room in the bot and invite your roommates to join.
            </p>
          </div>
        </a>
        <a
          href="https://t.me/chelekushka"
          target="_blank"
          className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
        >
          <div className="w-12">
            <span className="icon-[ic--baseline-telegram] text-5xl text-[#9747FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-text-main">
              Contact us
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-lg text-text-secondary/75">
              If you have any questions or suggestions, feel free to contact the
              developers.
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
