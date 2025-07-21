import FAQPage from "./FAQPage";
import TopBar from "./TopBar";

export function SportFAQPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
    >
      <TopBar />
      <main className="mobile-content-bottom-padding px-4 py-8">
        <FAQPage />
      </main>
    </div>
  );
}
