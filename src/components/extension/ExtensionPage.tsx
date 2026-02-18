import ExtensionScreenshotPNG from "/extension-screenshot.png";

export function ExtensionPage() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 @xl/content:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="group bg-base-200 rounded-box flex flex-row gap-4 px-4 py-6">
          <div className="w-12">
            <span className="icon-[material-symbols--quick-reference-outline-rounded] text-primary text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              What is it?
            </p>
            <p className="text-base-content/75 text-lg">
              InNoHassle Tools is a browser extension that provides convenient
              tools for Moodle, InNoHassle and other services at Innopolis
              University.
            </p>
            <p className="text-base-content flex items-center text-2xl font-semibold">
              Features:
            </p>
            <p className="text-base-content text-lg">
              🔄{" "}
              <span className="text-base-content/75">
                Autologin to Moodle without entering credentials
              </span>
            </p>
            <p className="text-base-content text-lg">
              🔗{" "}
              <span className="text-base-content/75">
                Quick links to your courses and IU resources
              </span>
            </p>
            <p className="text-base-content text-lg">
              🔍{" "}
              <span className="text-base-content/75">
                Integrated AI search engine for all Moodle materials
              </span>
            </p>
          </div>
        </div>
        <a
          href="https://chromewebstore.google.com/detail/innohassle-tools/cbeffcchbpgcmaphbpnnnjbaighmobmn"
          target="_blank"
          className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[logos--chrome] text-primary text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              Chrome extension
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-base-content/75 text-lg">
              Install the extension for Chromium-based browsers (Chrome, Edge,
              Yandex Browser, Arc) from the Chrome Web Store.
            </p>
          </div>
        </a>
        <a
          href="https://api.innohassle.ru/extension/latest-firefox.xpi"
          target="_blank"
          className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[logos--firefox] text-primary text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              Firefox extension
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-base-content/75 text-lg">
              Install the extension for Firefox-based browsers from our servers
              (supports automatic updates).
            </p>
          </div>
        </a>
        <a
          href="https://github.com/one-zero-eight/browser-extension"
          target="_blank"
          className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[mdi--github] text-base-content text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              GitHub
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-base-content/75 text-lg">
              Check out the source code, report issues and contribute to the
              project on GitHub.
            </p>
          </div>
        </a>
      </div>
      <div className="bg-base-200 rounded-box flex w-full flex-row items-center justify-center p-4">
        <img
          src={ExtensionScreenshotPNG}
          alt="extension screenshot"
          className="rounded-box w-full"
        />
      </div>
    </div>
  );
}
