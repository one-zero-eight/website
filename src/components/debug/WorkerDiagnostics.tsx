import type {
  BuildInfo,
  WorkerState,
  WorkerDiagnosticsSnapshot,
} from "@/service-worker/protocol.ts";
import { Trans } from "@lingui/react/macro";
import {
  BuildMetadata,
  DiagnosticFields,
  DiagnosticSection,
  RawDiagnosticData,
} from "./DiagnosticData.tsx";
import type { WorkerSnapshot } from "./collect-debug-snapshot.ts";

function WorkerTabs({
  status,
  runtimeClients,
  workerId,
}: {
  status: WorkerState;
  runtimeClients: WorkerDiagnosticsSnapshot["runtimeClients"];
  workerId: string;
}) {
  const clientIds = new Set([
    ...runtimeClients.windows.map((client) => client.id),
    ...status.clients.map((pin) => pin.clientId),
  ]);
  return (
    <DiagnosticSection
      title={<Trans>Tabs known to this worker</Trans>}
      source={`${workerId}.GET_DIAGNOSTICS → runtimeClients (Clients API) + storage.clients (IndexedDB)`}
    >
      <p className="text-base-content/70 text-sm">
        <Trans>
          Live windows come from the worker's Clients API. Stored pins and page
          reports come from IndexedDB. A stored pin alone does not mean the tab
          is still open.
        </Trans>
      </p>
      {clientIds.size === 0 && (
        <p className="text-sm">
          <Trans>No tabs or stored pins.</Trans>
        </p>
      )}
      {[...clientIds].map((clientId) => {
        const windowClient = runtimeClients.windows.find(
          (client) => client.id === clientId,
        );
        const pin = status.clients.find(
          (client) => client.clientId === clientId,
        );
        return (
          <article
            key={clientId}
            className="border-base-300 flex min-w-0 flex-col gap-3 rounded-lg border p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs wrap-anywhere">{clientId}</code>
              {clientId === runtimeClients.requestingClientId && (
                <span className="badge badge-primary badge-sm">
                  <Trans>This page</Trans>
                </span>
              )}
              {!windowClient && (
                <span className="badge badge-warning badge-sm">
                  <Trans>Stored pin only</Trans>
                </span>
              )}
            </div>
            <DiagnosticFields
              values={{
                "Clients API.url": windowClient?.url,
                "Clients API.controlled": windowClient?.controlled,
                "Clients API.visibilityState": windowClient?.visibilityState,
                "Clients API.focused": windowClient?.focused,
                "IndexedDB.buildId": pin?.buildId,
                "IndexedDB.pathname": pin?.pathname,
                "IndexedDB.navigationSource": pin?.navigationSource,
                "IndexedDB.nextCheckAt": pin?.nextCheckAt,
                "IndexedDB.interval (ms)": pin?.interval,
              }}
            />
            {pin &&
              status.builds.some(
                (build) => build.manifest.buildInfo.buildId === pin.buildId,
              ) && (
                <a
                  className="link text-sm"
                  href={`#${workerId}-build-${pin.buildId}`}
                >
                  <Trans>Open the manifest used by this tab</Trans>
                </a>
              )}
            {pin?.lastHello && (
              <RawDiagnosticData
                label={
                  <Trans>Last CLIENT_HELLO recorded in shared storage</Trans>
                }
                value={pin.lastHello}
              />
            )}
            {pin && !pin.lastHello && (
              <p className="text-base-content/60 text-xs">
                <Trans>No CLIENT_HELLO was recorded for this pin.</Trans>
              </p>
            )}
          </article>
        );
      })}
    </DiagnosticSection>
  );
}

export function WorkerDiagnostics({
  snapshot,
  appBuildInfo,
}: {
  snapshot: WorkerSnapshot;
  appBuildInfo: BuildInfo;
}) {
  const { browser, reply } = snapshot;
  const status = reply?.storage;
  const pagePin = status?.clients.find(
    (pin) => pin.clientId === reply?.runtimeClients.requestingClientId,
  );
  const pageBuild = status?.builds.find(
    (build) => build.manifest.buildInfo.buildId === pagePin?.buildId,
  );
  const metadataMatches =
    pageBuild &&
    Object.entries(appBuildInfo).every(
      ([key, value]) =>
        pageBuild.manifest.buildInfo[key as keyof BuildInfo] === value,
    );

  return (
    <section
      id={browser.id}
      className="border-base-300 flex min-w-0 scroll-mt-4 flex-col gap-4 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{browser.id}</h2>
        {browser.roles.map((role) => (
          <span key={role} className="badge badge-outline font-mono text-xs">
            {role}
          </span>
        ))}
      </div>
      <DiagnosticSection
        title={<Trans>What the browser knows about this worker</Trans>}
        source="ServiceWorker object → scriptURL, state, object identity"
      >
        <DiagnosticFields
          values={{ scriptURL: browser.scriptURL, state: browser.state }}
        />
      </DiagnosticSection>
      {snapshot.error && (
        <div className="alert alert-error flex-col items-start gap-1 wrap-anywhere">
          <p>
            <Trans>
              This worker did not answer GET_DIAGNOSTICS. No data from another
              worker is substituted.
            </Trans>
          </p>
          <code className="text-xs">{snapshot.error}</code>
        </div>
      )}
      {reply && status && (
        <>
          <div className="grid min-w-0 gap-4 @3xl/content:grid-cols-2">
            <DiagnosticSection
              title={<Trans>What this worker knows about itself</Trans>}
              source={`${browser.id}.GET_DIAGNOSTICS.worker → SW BUILD_INFO + self.location + self.registration`}
            >
              <DiagnosticFields
                values={{
                  serviceWorkerHash: reply.worker.buildInfo.serviceWorkerHash,
                  scriptURL: reply.worker.scriptURL,
                  scope: reply.worker.scope,
                  "Page RPC.receivedAt": snapshot.receivedAt,
                }}
              />
            </DiagnosticSection>
            <DiagnosticSection
              title={
                <Trans>What this worker knows about this page's report</Trans>
              }
              source={`${browser.id}.GET_DIAGNOSTICS → runtimeClients.requestingClientId + storage.clients[].lastHello`}
            >
              <DiagnosticFields
                values={{
                  requestingClientId: reply.runtimeClients.requestingClientId,
                  pinnedBuildId: pagePin?.buildId,
                  navigationSource: pagePin?.navigationSource,
                  reportedBuildId: pagePin?.lastHello?.message.buildId,
                  receivedAt: pagePin?.lastHello?.receivedAt,
                  "receivedBy.scriptURL":
                    pagePin?.lastHello?.receivedBy.scriptURL,
                  "receivedBy.serviceWorkerHash":
                    pagePin?.lastHello?.receivedBy.serviceWorkerHash,
                }}
              />
              <p className="text-base-content/70 text-sm">
                <Trans>
                  The page sends a build ID, not a manifest. The worker
                  downloads manifests from the server independently.
                </Trans>
              </p>
              {pagePin?.lastHello ? (
                <RawDiagnosticData
                  label={
                    <Trans>Last CLIENT_HELLO recorded in shared storage</Trans>
                  }
                  value={pagePin.lastHello.message}
                />
              ) : (
                <p className="text-sm">
                  <Trans>No CLIENT_HELLO was recorded for this page.</Trans>
                </p>
              )}
            </DiagnosticSection>
          </div>
          <DiagnosticSection
            title={<Trans>Manifest selected for this page</Trans>}
            source={`${browser.id}.GET_DIAGNOSTICS.storage → clients[requestingClientId].buildId → builds[].manifest`}
          >
            {pageBuild ? (
              <>
                <p className="text-sm">
                  {metadataMatches ? (
                    <span className="text-success">
                      <Trans>
                        Stored manifest metadata matches this App's BUILD_INFO.
                      </Trans>
                    </span>
                  ) : (
                    <span className="text-warning">
                      <Trans>
                        Stored manifest metadata differs from this App's
                        BUILD_INFO.
                      </Trans>
                    </span>
                  )}
                </p>
                <BuildMetadata info={pageBuild.manifest.buildInfo} />
                <DiagnosticFields
                  values={{
                    state: pageBuild.state,
                    cacheName: pageBuild.cacheName,
                  }}
                />
                <RawDiagnosticData
                  label={<Trans>Full stored manifest</Trans>}
                  value={pageBuild.manifest}
                />
              </>
            ) : (
              <p className="text-sm">
                <Trans>
                  This worker has no stored manifest for this page's pin. This
                  does not mean that the page is running the latest ready build.
                </Trans>
              </p>
            )}
          </DiagnosticSection>
          <WorkerTabs
            status={status}
            runtimeClients={reply.runtimeClients}
            workerId={browser.id}
          />
          <div className="grid min-w-0 gap-4 @3xl/content:grid-cols-2">
            <DiagnosticSection
              title={<Trans>Shared offline storage state</Trans>}
              source={`${browser.id}.GET_DIAGNOSTICS.storage → IndexedDB (shared by workers of this origin)`}
            >
              <DiagnosticFields
                values={{
                  generation: status.generation,
                  blocked: status.blocked,
                  resetPending: status.resetPending,
                  latestReadyBuildId: status.latestReadyBuildId,
                  lastSuccessfulCheckAt: status.lastSuccessfulCheckAt,
                }}
              />
              <RawDiagnosticData
                label={<Trans>Last manifest check</Trans>}
                value={status.manifestCheck}
              />
            </DiagnosticSection>
            <DiagnosticSection
              title={<Trans>Cache Storage observed by this worker</Trans>}
              source={`${browser.id}.GET_DIAGNOSTICS.cacheStorage → caches.keys(), cache.keys(), response bodies`}
            >
              {reply.cacheStorage.length === 0 && (
                <p className="text-sm">
                  <Trans>No caches.</Trans>
                </p>
              )}
              {reply.cacheStorage.map((cache) => (
                <div
                  key={cache.name}
                  className="border-base-300 border-b pb-3 last:border-0 last:pb-0"
                >
                  <DiagnosticFields
                    values={{
                      name: cache.name,
                      entries: cache.entries,
                      bytes: cache.bytes,
                    }}
                  />
                </div>
              ))}
            </DiagnosticSection>
          </div>
          <DiagnosticSection
            title={<Trans>Manifests stored by the worker</Trans>}
            source={`${browser.id}.GET_DIAGNOSTICS.storage.builds → IndexedDB (original server manifests)`}
          >
            <p className="text-base-content/70 text-sm">
              <Trans>
                Latest ready is the offline fallback, not necessarily the build
                loaded by this page. A snapshot refresh does not fetch the
                server's current manifest.
              </Trans>
            </p>
            {status.builds.length === 0 && (
              <p className="text-sm">
                <Trans>No stored manifests.</Trans>
              </p>
            )}
            {status.builds.map((build) => (
              <article
                key={build.cacheName}
                id={`${browser.id}-build-${build.manifest.buildInfo.buildId}`}
                className="border-base-300 flex min-w-0 scroll-mt-4 flex-col gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-outline font-mono text-xs">
                    {build.state}
                  </span>
                  {build.manifest.buildInfo.buildId ===
                    status.latestReadyBuildId && (
                    <span className="badge badge-success badge-sm">
                      <Trans>Latest ready</Trans>
                    </span>
                  )}
                  {build.manifest.buildInfo.buildId === pagePin?.buildId && (
                    <span className="badge badge-primary badge-sm">
                      <Trans>This page</Trans>
                    </span>
                  )}
                  <span className="text-base-content/70 text-xs">
                    {build.completed} / {build.manifest.resources.length}
                  </span>
                </div>
                <BuildMetadata info={build.manifest.buildInfo} />
                <DiagnosticFields
                  values={{
                    cacheName: build.cacheName,
                    entrypoint: build.manifest.entrypoint,
                    schemaVersion: build.manifest.schemaVersion,
                  }}
                />
                {build.error && (
                  <p className="text-error text-sm wrap-anywhere">
                    {build.error}
                  </p>
                )}
                <RawDiagnosticData
                  label={<Trans>Full stored manifest</Trans>}
                  value={build.manifest}
                />
              </article>
            ))}
          </DiagnosticSection>
          <RawDiagnosticData
            label={
              <Trans>Full GET_DIAGNOSTICS response from this worker</Trans>
            }
            value={reply}
          />
        </>
      )}
    </section>
  );
}
