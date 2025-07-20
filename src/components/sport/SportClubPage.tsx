import ClubPage from "./ClubPage";
import { SportNavigation } from "./SportNavigation";

export function SportClubPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
    >
      <main className="mobile-content-bottom-padding px-4 py-8">
        <SportNavigation />
        <ClubPage />
      </main>
    </div>
  );
}
