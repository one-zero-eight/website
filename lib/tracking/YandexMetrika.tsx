import Script from "next/script";

declare global {
  interface Window {
    ym: (
      id: number,
      method: "reachGoal",
      target: string,
      params?: object
    ) => void;
  }
}

export const ym_id =
  process.env.NEXT_PUBLIC_TRACKER_YM !== undefined &&
  process.env.NEXT_PUBLIC_TRACKER_YM !== "00000000"
    ? Number(process.env.NEXT_PUBLIC_TRACKER_YM)
    : undefined;

export default function YandexMetrika() {
  if (ym_id === undefined) {
    return undefined;
  }

  return (
    <>
      <Script id="yandex-mtrika" strategy="afterInteractive">
        {`
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(${ym_id}, "init", {
            clickmap:true,
            trackLinks:true,
            accurateTrackBounce:true,
            webvisor:true
          });
        `}
      </Script>
      <noscript id="yandex-metrika-pixel">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${ym_id}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}

// https://yandex.ru/support/metrica/general/goal-js-event.html
export function ymEvent(target: string, params?: object) {
  if (window !== undefined && window.ym !== undefined && ym_id !== undefined) {
    window.ym(ym_id, "reachGoal", target, params);
  }
}
