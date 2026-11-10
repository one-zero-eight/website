import { Trans } from "@lingui/react/macro";
import { DiagnosticFields, DiagnosticSection } from "./DiagnosticData.tsx";
import type { BrowserSnapshot } from "./collect-debug-snapshot.ts";

function renderWorkerReference(workerId: string | null) {
  if (!workerId) return null;
  return (
    <a className="link" href={`#${workerId}`}>
      {workerId}
    </a>
  );
}

export function BrowserDiagnostics({ browser }: { browser: BrowserSnapshot }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold">
        <Trans>Browser's view</Trans>
      </h2>
      <DiagnosticSection
        title={<Trans>Registrations and worker roles</Trans>}
        source="navigator.serviceWorker.controller + navigator.serviceWorker.getRegistrations()"
      >
        <DiagnosticFields
          values={{
            supported: browser.supported,
            controller: renderWorkerReference(browser.controller),
            observedAt: browser.observedAt,
          }}
        />
        {browser.error && (
          <div className="alert alert-error wrap-anywhere">{browser.error}</div>
        )}
        {!browser.supported && (
          <p className="text-warning text-sm">
            <Trans>Service workers are not supported in this browser.</Trans>
          </p>
        )}
        {browser.supported &&
          !browser.error &&
          browser.registrations.length === 0 && (
            <p className="text-sm">
              <Trans>No registrations for this origin.</Trans>
            </p>
          )}
        {browser.registrations.map((registration) => (
          <div
            key={registration.scope}
            className="border-base-300 rounded-lg border p-3"
          >
            <DiagnosticFields
              values={{
                scope: registration.scope,
                updateViaCache: registration.updateViaCache,
                active: renderWorkerReference(registration.active),
                waiting: renderWorkerReference(registration.waiting),
                installing: renderWorkerReference(registration.installing),
              }}
            />
          </div>
        ))}
        <dl className="text-base-content/70 grid gap-2 text-sm @lg/content:grid-cols-[6rem_minmax(0,1fr)]">
          <dt className="font-mono">controlling</dt>
          <dd>
            <Trans>Handles requests from this page.</Trans>
          </dd>
          <dt className="font-mono">active</dt>
          <dd>
            <Trans>
              Active worker of a registration; not necessarily this page's
              controller.
            </Trans>
          </dd>
          <dt className="font-mono">waiting</dt>
          <dd>
            <Trans>Installed worker waiting to activate.</Trans>
          </dd>
          <dt className="font-mono">installing</dt>
          <dd>
            <Trans>Worker currently being installed.</Trans>
          </dd>
        </dl>
        <p className="text-base-content/60 text-xs">
          <Trans>
            worker-N is a local reference within this snapshot, not a persistent
            browser ID. Equal script URLs alone do not identify the same worker
            instance.
          </Trans>
        </p>
      </DiagnosticSection>
    </section>
  );
}
