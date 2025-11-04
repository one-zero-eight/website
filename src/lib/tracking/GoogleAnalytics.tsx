import { Helmet } from "@dr.pogodin/react-helmet";

export const ga_id =
  import.meta.env.VITE_TRACKER_GA !== undefined &&
  import.meta.env.VITE_TRACKER_GA !== "G-XXXXXXXXXX"
    ? import.meta.env.VITE_TRACKER_GA
    : undefined;

export function GoogleAnalytics() {
  if (ga_id === undefined) {
    return undefined;
  }

  return (
    <Helmet>
      <script
        src={`https://www.googletagmanager.com/gtag/js?id=${ga_id}`}
        defer
      />
      <script id="google-analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${ga_id}');
        `}
      </script>
    </Helmet>
  );
}
