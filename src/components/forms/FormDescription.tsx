export function FormDescription() {
  return (
    <div className="mt-6 text-center text-sm text-contrast/60">
      <p>
        This will create a link that automatically fills in the respondent's
        email address when they open the form.
      </p>
      <p className="mt-2">
        Only{" "}
        <a
          href="https://forms.yandex.ru/admin/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand-violet-dark text-brand-violet underline"
        >
          Yandex Forms
        </a>{" "}
        URLs are supported. See the instructions{" "}
        <a
          href="https://disk.yandex.ru/i/syqHpBbQ4AfTMw"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand-violet-dark text-brand-violet underline"
        >
          here
        </a>
        .
      </p>
    </div>
  );
}
