import { Trans } from "@lingui/react/macro";

export function FormDescription() {
  return (
    <div className="text-base-content/60 mt-6 text-center text-sm">
      <p>
        <Trans>
          This will create a link that automatically fills in the respondent's
          email address when they open the form.
        </Trans>
      </p>
      <p className="mt-2">
        <Trans>
          Only{" "}
          <a
            href="https://forms.yandex.ru/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-dark text-primary underline"
          >
            Yandex Forms
          </a>{" "}
          URLs are supported. See the instructions{" "}
          <a
            href="https://disk.yandex.ru/i/syqHpBbQ4AfTMw"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-dark text-primary underline"
          >
            here
          </a>
          .
        </Trans>
      </p>
    </div>
  );
}
