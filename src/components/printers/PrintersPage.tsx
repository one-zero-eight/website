export function PrintersPage() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4">
      <div className="flex flex-col gap-4">
        <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-6">
          <div className="w-12">
            <span className="icon-[material-symbols--quick-reference-outline-rounded] text-5xl text-brand-violet" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-contrast">
              What is it?
            </p>
            <p className="text-lg text-contrast/75">
              @InnoPrintBot is a bot for printing & scanning documents on
              Innopolis University printers.
            </p>
            <p className="flex items-center text-2xl font-semibold text-contrast">
              Features:
            </p>
            <p className="text-lg text-contrast">
              🖨{" "}
              <span className="text-contrast/75">
                Just send a document to the bot and it will be printed.
              </span>
            </p>
            <p className="text-lg text-contrast">
              📠{" "}
              <span className="text-contrast/75">
                Manual Scan mode: place documents on scanner glass and get PDF
                of one or more pages.
              </span>
            </p>
            <p className="text-lg text-contrast">
              📚{" "}
              <span className="text-contrast/75">
                Auto Scan mode: use scanner's automatic feeder to scan a bunch
                of papers (supports both-sides scan).
              </span>
            </p>
          </div>
        </div>
        <a
          href="https://t.me/InnoPrintBot"
          target="_blank"
          className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-6 hover:bg-secondary"
        >
          <div className="w-12">
            <span className="icon-[mdi--robot-excited-outline] text-5xl text-brand-violet" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-contrast">
              Telegram bot
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-lg text-contrast/75">
              Just send /start to the bot and follow the instructions.
            </p>
          </div>
        </a>
        <a
          href="https://t.me/ArtemSBulgakov"
          target="_blank"
          className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-6 hover:bg-secondary"
        >
          <div className="w-12">
            <span className="icon-[ic--baseline-telegram] text-5xl text-brand-violet" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-contrast">
              Contact us
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-lg text-contrast/75">
              If you have any questions or suggestions, feel free to contact the
              developers.
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
