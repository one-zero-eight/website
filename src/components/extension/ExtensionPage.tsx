import ExtensionScreenshotPNG from "/extension-screenshot.png";

export function ExtensionPage() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 @xl/content:grid-cols-2">
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
              InNoHassle Tools is a browser extension that provides convenient
              tools for Moodle, InNoHassle and other services at Innopolis
              University.
            </p>
            <p className="flex items-center text-2xl font-semibold text-text-main">
              Features:
            </p>
            <p className="text-lg text-text-secondary">
              🔄{" "}
              <span className="text-text-secondary/75">
                Autologin to Moodle without entering credentials
              </span>
            </p>
            <p className="text-lg text-text-secondary">
              🔗{" "}
              <span className="text-text-secondary/75">
                Quick links to your courses and IU resources
              </span>
            </p>
            <p className="text-lg text-text-secondary">
              🔍{" "}
              <span className="text-text-secondary/75">
                Integrated AI search engine for all Moodle materials
              </span>
            </p>
          </div>
        </div>
        <a
          href="https://chromewebstore.google.com/detail/innohassle-tools/cbeffcchbpgcmaphbpnnnjbaighmobmn"
          target="_blank"
          className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
        >
          <div className="w-12">
            <span className="icon-[logos--chrome] text-5xl text-[#9747FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-text-main">
              Chrome extension
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-lg text-text-secondary/75">
              Install the extension for Chromium-based browsers (Chrome, Edge,
              Yandex Browser, Arc) from the Chrome Web Store.
            </p>
          </div>
        </a>
        <a
          href="https://api.innohassle.ru/extension/latest-firefox.xpi"
          target="_blank"
          className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
        >
          <div className="w-12">
            <span className="icon-[logos--firefox] text-5xl text-[#9747FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-text-main">
              Firefox extension
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-lg text-text-secondary/75">
              Install the extension for Firefox-based browsers from our servers
              (supports automatic updates).
            </p>
          </div>
        </a>
        <a
          href="https://github.com/one-zero-eight/browser-extension"
          target="_blank"
          className="group flex flex-row gap-4 rounded-2xl bg-primary-main px-4 py-6 hover:bg-secondary-main"
        >
          <div className="w-12">
            <span className="icon-[mdi--github] text-5xl text-text-main" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center text-2xl font-semibold text-text-main">
              GitHub
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-lg text-text-secondary/75">
              Check out the source code, report issues and contribute to the
              project on GitHub.
            </p>
          </div>
        </a>
      </div>
      <div className="flex w-full flex-row items-center justify-center rounded-2xl bg-primary-main p-4">
        <img
          src={ExtensionScreenshotPNG}
          alt="extension screenshot"
          className="w-full rounded-2xl"
        />
      </div>
    </div>
  );
}
