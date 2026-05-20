import clsx from "clsx";

export function SectionTabsBar({
  tabs,
  activeKey,
  onChange,
}: {
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="tabs tabs-box bg-base-200 h-auto w-full shrink-0 flex-wrap justify-start gap-1 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={clsx(
            "tab rounded-btn",
            activeKey === tab.key ? "tab-active" : "",
          )}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
