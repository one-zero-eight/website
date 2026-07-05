import { Link } from "@tanstack/react-router";

export function WebPrintLandingPage() {
  return (
    <div className="@container/content mx-auto w-full max-w-[1200px] px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-base-content mb-2 text-2xl font-bold md:text-3xl">
          Inno Web Print
        </h1>
        <p className="text-base-content/50 mx-auto max-w-xl">
          Print and scan documents on Innopolis University printers directly
          from your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 @lg/content:grid-cols-2">
        <Link
          to="/printers/print"
          className="card card-border bg-base-100 hover:border-primary/40 transition-colors"
        >
          <div className="card-body items-center text-center">
            <span className="icon-[material-symbols--print-rounded] text-primary text-5xl" />
            <h2 className="card-title">Print</h2>
            <p className="text-base-content/50">
              Upload a document, choose a printer and options, then send it to
              print.
            </p>
            <div className="card-actions mt-2 w-full">
              <span className="btn btn-primary btn-sm w-full">Open print</span>
            </div>
          </div>
        </Link>

        <Link
          to="/printers/scan"
          className="card card-border bg-base-100 hover:border-primary/40 transition-colors"
        >
          <div className="card-body items-center text-center">
            <span className="icon-[material-symbols--adf-scanner-rounded] text-primary text-5xl" />
            <h2 className="card-title">Scan</h2>
            <p className="text-base-content/50">
              Scan pages from a university scanner and download the result as a
              PDF.
            </p>
            <div className="card-actions mt-2 w-full">
              <span className="btn btn-primary btn-sm w-full">Open scan</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="card card-border mt-8">
        <div className="card-body">
          <h2 className="card-title text-base">
            <span className="icon-[material-symbols--info-outline-rounded]" />
            Supported file formats
          </h2>
          <p className="text-base-content/50 text-sm">
            PDF, Word, Excel, OpenDocument, images (PNG, JPG, BMP), and plain
            text. Maximum file size is 20 MB.
          </p>
        </div>
      </div>
    </div>
  );
}
