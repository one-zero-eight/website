import fontStyles from "@/components/web-print/css/printers.fonts.module.css";
import marginStyles from "@/components/web-print/css/printers.margins.module.css";

export function PaperCountIndication({ papersCount }: { papersCount: number }) {
  return papersCount ? (
    <p
      className={`${marginStyles.leftMargin_buttonHorizontalPadding} ${fontStyles.formSecondary}`}
    >
      <span>{papersCount}</span> papers
    </p>
  ) : (
    <></>
  );
}
