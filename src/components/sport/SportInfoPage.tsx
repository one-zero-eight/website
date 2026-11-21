import { useLingui } from "@lingui/react";
import InfoEn from "./info/info.mdx";
import InfoRu from "./info/info.ru.mdx";

export function SportInfoPage() {
  const { i18n } = useLingui();
  const Info = i18n.locale === "ru" ? InfoRu : InfoEn;

  return (
    <div className="prose dark:prose-invert mx-auto w-full max-w-3xl px-4 py-6">
      <Info />
    </div>
  );
}
