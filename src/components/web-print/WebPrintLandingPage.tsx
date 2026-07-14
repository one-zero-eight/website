import { Link } from "@tanstack/react-router";

export function WebPrintLandingPage() {
  return (
    <div className="@container/content mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 py-8">
      <section className="flex flex-col gap-3">
        <p className="text-base leading-relaxed">
          Print and scan on university printers from your browser — upload a
          file or place a document on the glass, choose a device, and go.
        </p>
        <ul className="text-base-content/70 flex flex-col gap-2 text-base leading-relaxed">
          <li className="flex gap-2">
            <span className="icon-[material-symbols--sync-rounded] text-primary mt-0.5 shrink-0 text-xl" />
            Automatic conversion of PDF, Word, Excel, images, and more for
            printing
          </li>
          <li className="flex gap-2">
            <span className="icon-[material-symbols--crop-rounded] text-primary mt-0.5 shrink-0 text-xl" />
            Smart crop that detects document edges when scanning
          </li>
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <Link
          to="/printers/print"
          className="bg-base-200 hover:bg-base-300 rounded-field flex items-center gap-3 px-4 py-3.5 transition-colors"
        >
          <span className="icon-[material-symbols--upload-file-rounded] text-primary shrink-0 text-3xl" />
          <div className="min-w-0">
            <p className="text-base font-medium">Print</p>
            <p className="text-base-content/60 text-base">
              Upload a file, pick a printer, send the job
            </p>
          </div>
        </Link>

        <Link
          to="/printers/scan"
          className="bg-base-200 hover:bg-base-300 rounded-field flex items-center gap-3 px-4 py-3.5 transition-colors"
        >
          <span className="icon-[material-symbols--adf-scanner-rounded] text-primary shrink-0 text-3xl" />
          <div className="min-w-0">
            <p className="text-base font-medium">Scan</p>
            <p className="text-base-content/60 text-base">
              Scan pages and download a PDF
            </p>
          </div>
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base-content text-xl font-semibold">Locations</h2>
        <p className="text-base-content/70 text-base leading-relaxed">
          Two printers are available on campus right now:
        </p>
        <ul className="text-base-content/70 flex flex-col gap-2 text-base leading-relaxed">
          <li>
            <span className="text-base-content">319</span>
            <span className="text-base-content/70"> — 3rd floor · </span>
            <Link
              to="/maps"
              search={{ scene: "university-floor-3", area: "printer-319" }}
              className="text-primary hover:underline"
            >
              Show on map
            </Link>
          </li>
          <li>
            <span className="text-base-content">VK Zone</span>
            <span className="text-base-content/70"> — 5th floor · </span>
            <Link
              to="/maps"
              search={{ scene: "university-floor-5", area: "printer-5f" }}
              className="text-primary hover:underline"
            >
              Show on map
            </Link>
          </li>
        </ul>
      </section>

      <a
        href="https://telegram.me/InnoPrintBot"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-base-200 hover:bg-base-300 rounded-field flex items-center gap-3 px-4 py-3.5 transition-colors"
      >
        <span className="icon-[mdi--robot-excited-outline] text-primary shrink-0 text-3xl" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-base font-medium">
            Telegram bot
            <span className="icon-[material-symbols--open-in-new-rounded] text-base-content/50 text-base" />
          </p>
          <p className="text-base-content/60 text-base">
            Print and scan via @InnoPrintBot
          </p>
        </div>
      </a>
    </div>
  );
}
