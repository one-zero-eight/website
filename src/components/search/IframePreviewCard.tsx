import { searchTypes } from "@/api/search";
import clsx from "clsx";
import { useState } from "react";
import { componentByPath, resolvePageByUrl } from "./innohassleRoutes";
import { MapsPage } from "../maps/MapsPage";

function DynamicPageComponent({ url }: { url: string }) {
  const result = resolvePageByUrl(url);

  if (!result) {
    return (
      <div className="border-border text-muted flex h-[25vh] w-full items-center justify-center rounded-xl border p-4 text-center md:h-[50vh]">
        Sorry, this site does not support preview. Please, open it directly.
      </div>
    );
  }

  const { Component, props } = result;
  return <Component {...props} />;
}

export default function IframePreviewCard({
  source,
  onClose,
}: {
  source: searchTypes.SchemaSearchResponse["source"];
  onClose: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  const url = "url" in source ? source.url : "";
  const parsedUrl = new URL(url);

  const component = componentByPath[parsedUrl.pathname];
  const isInnohassleComponent = !!component;

  const isInsecureUrl =
    url.startsWith("http://") ||
    url.startsWith("https://hotel.innopolis.university/") ||
    url.startsWith("https://help.university.innopolis.ru/") ||
    url.startsWith("https://my.university.innopolis.ru/");

  const isExternalPage = !!url && !hasError && !component;

  return (
    <div
      className={clsx(
        "flex h-fit max-h-full w-full min-w-0 flex-col gap-2 rounded-lg border border-secondary-hover bg-floating p-4",
        "z-8 static fixed inset-8 top-8 md:sticky md:inset-0 md:top-4",
      )}
    >
      <div className="flex flex-row items-center justify-between">
        <p className="truncate text-xs font-semibold dark:text-white md:text-2xl">
          {source.display_name}
        </p>
        <button
          onClick={() => {
            onClose();
          }}
          className="bg-background hover:bg-accent items-end rounded-full px-2 py-1 text-sm shadow-md"
        >
          ✕
        </button>
      </div>
      {!isInsecureUrl ? (
        <>
          {isInnohassleComponent ? (
            component.component === MapsPage ? (
              <div className="h-full overflow-hidden rounded-xl !border @container/content">
                <MapsPage
                  sceneId={parsedUrl.searchParams.get("scene") ?? undefined}
                  areaId={parsedUrl.searchParams.get("area") ?? undefined}
                  q={undefined}
                />
              </div>
            ) : (
              <div className="h-[50vh] w-full rounded-xl !border @container/content">
                <div className="h-full w-full overflow-hidden rounded-[0.75rem]">
                  <div className="h-full w-full overflow-auto">
                    <DynamicPageComponent url={url} />
                  </div>
                </div>
              </div>
            )
          ) : (
            isExternalPage && (
              <iframe
                src={url}
                onError={() => setHasError(true)}
                title="Preview"
                className="border-border h-[50vh] w-full rounded-xl border"
                loading="lazy"
              />
            )
          )}
        </>
      ) : (
        <div className="border-border text-muted flex h-[25vh] w-full items-center justify-center rounded-xl border p-4 text-center md:h-[50vh]">
          Sorry, this site does not support preview. Please, open it directly.
        </div>
      )}

      <div className="flex justify-center">
        <a href={url} className="hover:underline">
          {"Go to website ->"}
        </a>
      </div>
    </div>
  );
}
