import SchedulePage from './SchedulePage';
import { SportNavigation } from './SportNavigation';

export function SportSchedulePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-pagebg))' }}>
      <main className="px-4 py-8 mobile-content-bottom-padding">
        <SportNavigation />
        <SchedulePage />
      </main>
    </div>
  );
} 