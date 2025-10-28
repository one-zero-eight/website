import ExtensionScreenshotPNG from "/extension-screenshot.png";

export function ExtensionPage() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 @xl/content:grid-cols-2">
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
              InNoHassle Tools is a browser extension that provides convenient
              tools for Moodle, InNoHassle and other services at Innopolis
              University.
            </p>
            <p className="text-contrast flex items-center text-2xl font-semibold">
              Features:
            </p>
            <p className="text-contrast text-lg">
              🔄{" "}
              <span className="text-contrast/75">
                Autologin to Moodle without entering credentials
              </span>
            </p>
            <p className="text-contrast text-lg">
              🔗{" "}
              <span className="text-contrast/75">
                Quick links to your courses and IU resources
              </span>
            </p>
            <p className="text-contrast text-lg">
              🔍{" "}
              <span className="text-contrast/75">
                Integrated AI search engine for all Moodle materials
              </span>
            </p>
          </div>
        </div>
        <a
          href="https://chromewebstore.google.com/detail/innohassle-tools/cbeffcchbpgcmaphbpnnnjbaighmobmn"
          target="_blank"
          className="group bg-primary hover:bg-secondary flex flex-row gap-4 rounded-2xl px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[logos--chrome] text-brand-violet text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-contrast flex items-center text-2xl font-semibold">
              Chrome extension
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-contrast/75 text-lg">
              Install the extension for Chromium-based browsers (Chrome, Edge,
              Yandex Browser, Arc) from the Chrome Web Store.
            </p>
          </div>
        </a>
        <a
          href="https://api.innohassle.ru/extension/latest-firefox.xpi"
          target="_blank"
          className="group bg-primary hover:bg-secondary flex flex-row gap-4 rounded-2xl px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[logos--firefox] text-brand-violet text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-contrast flex items-center text-2xl font-semibold">
              Firefox extension
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-contrast/75 text-lg">
              Install the extension for Firefox-based browsers from our servers
              (supports automatic updates).
            </p>
          </div>
        </a>
        <a
          href="https://github.com/one-zero-eight/browser-extension"
          target="_blank"
          className="group bg-primary hover:bg-secondary flex flex-row gap-4 rounded-2xl px-4 py-6"
        >
          <div className="w-12">
            <span className="icon-[mdi--github] text-contrast text-5xl" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-contrast flex items-center text-2xl font-semibold">
              GitHub
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
            </p>
            <p className="text-contrast/75 text-lg">
              Check out the source code, report issues and contribute to the
              project on GitHub.
            </p>
          </div>
        </a>
      </div>
      <div className="bg-primary flex w-full flex-row items-center justify-center rounded-2xl p-4">
        <img
          src={ExtensionScreenshotPNG}
          alt="extension screenshot"
          className="w-full rounded-2xl"
        />
      </div>
    </div>
  );
}
