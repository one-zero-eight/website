import type { BuildInfo, BuildManifest } from "@/service-worker/protocol.ts";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";

export function DiagnosticSection({
  title,
  source,
  children,
}: {
  title: ReactNode;
  source: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-3 p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-base-content/60 text-xs wrap-anywhere">
          <Trans>Source:</Trans> <code>{source}</code>
        </p>
      </div>
      {children}
    </section>
  );
}

export function DiagnosticFields({
  values,
}: {
  values: Record<string, ReactNode>;
}) {
  return (
    <dl className="grid min-w-0 gap-3 text-sm">
      {Object.entries(values).map(([label, value]) => (
        <div
          key={label}
          className="grid min-w-0 gap-1 @lg/content:grid-cols-[10rem_minmax(0,1fr)]"
        >
          <dt className="text-base-content/60 font-mono text-xs wrap-anywhere">
            {label}
          </dt>
          <dd className="min-w-0 font-mono text-xs wrap-anywhere">
            {typeof value === "boolean" ? String(value) : (value ?? "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RawDiagnosticData({
  value,
  label,
}: {
  value: unknown;
  label?: ReactNode;
}) {
  return (
    <details className="min-w-0">
      <summary className="text-base-content/70 cursor-pointer text-xs">
        {label ?? <Trans>Raw data</Trans>}
      </summary>
      <pre className="bg-base-100 rounded-box mt-2 max-h-96 overflow-auto p-3 text-xs wrap-anywhere whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

/** Build identity, plus the commit and time recorded in a manifest. */
export function BuildMetadata({
  info,
  manifest,
}: {
  info: BuildInfo;
  manifest?: Pick<BuildManifest, "commitHash" | "builtAt">;
}) {
  const { i18n } = useLingui();
  return (
    <DiagnosticFields
      values={{
        version: info.version,
        buildId: info.buildId,
        ...(manifest && {
          "manifest.commitHash": manifest.commitHash,
          "manifest.builtAt": (
            <time dateTime={manifest.builtAt} title={manifest.builtAt}>
              {new Date(manifest.builtAt).toLocaleString(i18n.locale)}
            </time>
          ),
        }),
      }}
    />
  );
}
