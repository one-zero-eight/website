import { Trans } from "@lingui/react/macro";
import {
  BuildMetadata,
  DiagnosticFields,
  DiagnosticSection,
  RawDiagnosticData,
} from "./DiagnosticData.tsx";
import type { DebugSnapshot } from "./collect-debug-snapshot.ts";

export function AppDiagnostics({ app }: { app: DebugSnapshot["app"] }) {
  const { lastHello, lastNotification } = app.communication;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold">
        <Trans>App's view</Trans>
      </h2>
      <div className="grid min-w-0 gap-4 @3xl/content:grid-cols-2">
        <DiagnosticSection
          title={<Trans>What this App knows about itself</Trans>}
          source="Page globalThis.BUILD_INFO + document.documentElement.dataset.buildId"
        >
          <BuildMetadata info={app.buildInfo} />
          <DiagnosticFields
            values={{
              htmlBuildId: app.htmlBuildId,
              url: app.url,
              observedAt: app.observedAt,
            }}
          />
          <p className="text-sm">
            {app.htmlBuildId === app.buildInfo.buildId ? (
              <span className="text-success">
                <Trans>HTML and App build IDs match.</Trans>
              </span>
            ) : (
              <span className="text-error">
                <Trans>HTML and App build IDs differ.</Trans>
              </span>
            )}
          </p>
        </DiagnosticSection>
        <DiagnosticSection
          title={<Trans>What this App sent to its controller</Trans>}
          source="register-sw.ts → sendHello() → getPageWorkerCommunication().lastHello"
        >
          {lastHello ? (
            <>
              <DiagnosticFields
                values={{
                  targetScriptURL: lastHello.targetScriptURL,
                  sentBuildId: lastHello.message.buildId,
                  sentAt: lastHello.sentAt,
                  acknowledgedAt: lastHello.acknowledgedAt,
                  acknowledgedGeneration: lastHello.reply?.generation,
                  navigationSource: lastHello.reply?.navigationSource,
                }}
              />
              {lastHello.error && (
                <p className="text-error text-sm wrap-anywhere">
                  {lastHello.error}
                </p>
              )}
              <RawDiagnosticData
                label={
                  <Trans>
                    Last CLIENT_HELLO sent by this App, acknowledgement, and
                    target
                  </Trans>
                }
                value={lastHello}
              />
            </>
          ) : (
            <p className="text-sm">
              <Trans>This App has not sent CLIENT_HELLO yet.</Trans>
            </p>
          )}
          <p className="text-base-content/70 text-sm">
            <Trans>
              The page sends a build ID, not a manifest. The worker downloads
              manifests from the server independently.
            </Trans>
          </p>
        </DiagnosticSection>
      </div>
      <DiagnosticSection
        title={<Trans>Automatic update</Trans>}
        source="auto-update.ts → pageWorkerCommunication.autoUpdate"
      >
        <DiagnosticFields values={app.communication.autoUpdate} />
        <p className="text-base-content/70 text-sm">
          <Trans>
            Pages update automatically by default. An active
            useAutoUpdateBlocker in a component pauses updates until it is
            disabled or unmounted.
          </Trans>
        </p>
      </DiagnosticSection>
      <DiagnosticSection
        title={<Trans>Last worker notification observed by this App</Trans>}
        source="navigator.serviceWorker message event → getPageWorkerCommunication().lastNotification"
      >
        {lastNotification ? (
          <>
            <DiagnosticFields
              values={{
                type: lastNotification.message.type,
                sourceScriptURL: lastNotification.sourceScriptURL,
                receivedAt: lastNotification.receivedAt,
              }}
            />
            <RawDiagnosticData value={lastNotification} />
          </>
        ) : (
          <p className="text-sm">
            <Trans>This App has not received a worker notification yet.</Trans>
          </p>
        )}
      </DiagnosticSection>
    </section>
  );
}
