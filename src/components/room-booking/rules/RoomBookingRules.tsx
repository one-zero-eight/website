import { useLingui } from "@lingui/react";
import Rules from "./rules.mdx";
import RulesRu from "./rules.ru.mdx";

export function RoomBookingRules() {
  const { i18n } = useLingui();
  return (
    <div className="prose mx-auto px-4 py-4 lg:py-16">
      {i18n.locale === "ru" ? <RulesRu /> : <Rules />}
    </div>
  );
}
