import { Link, ValidateLinkOptions } from "@tanstack/react-router";

export function GuardTabs() {
  return (
    <div className="border-base-300 flex shrink-0 flex-row gap-2 overflow-x-auto border-b px-4 whitespace-nowrap">
      <TabLink to="/guard">Info</TabLink>
      <TabLink to="/guard/create">Create Sheet</TabLink>
      <TabLink to="/guard/copy">Copy Sheet</TabLink>
      <TabLink to="/guard/files">Your Sheets</TabLink>
    </div>
  );
}

function TabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-3 py-2.5"
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}
