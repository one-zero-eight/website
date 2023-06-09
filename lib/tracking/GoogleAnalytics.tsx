import Script from "next/script";

export const ga_id =
  process.env.NEXT_PUBLIC_TRACKER_GA !== undefined &&
  process.env.NEXT_PUBLIC_TRACKER_GA !== "G-XXXXXXXXXX"
    ? process.env.NEXT_PUBLIC_TRACKER_GA
    : undefined;

export default function GoogleAnalytics() {
  if (ga_id === undefined) {
    return undefined;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ga_id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${ga_id}');
        `}
      </Script>
    </>
  );
}
