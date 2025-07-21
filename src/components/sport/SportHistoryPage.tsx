import HistoryPage from "./HistoryPage";
import TopBar from "./TopBar";

export function SportHistoryPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
    >
      <TopBar />
      <main className="mobile-content-bottom-padding px-4 py-8">
        <HistoryPage />
      </main>
    </div>
  );
}
