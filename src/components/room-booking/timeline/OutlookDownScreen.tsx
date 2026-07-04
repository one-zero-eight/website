export function OutlookDownScreen() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-4">
      <div className="card bg-base-100 border-base-300 w-full max-w-md border shadow-sm">
        <div className="card-body items-center gap-2 text-center">
          <span className="icon-[material-symbols--cloud-off] text-error text-5xl" />
          <h2 className="text-xl font-semibold">
            Outlook API is currently unavailable
          </h2>
          <p className="text-base-content/70 max-w-sm text-sm">
            Room booking relies on the Outlook calendar service, which appears
            to be down right now. We have been notified about this.
          </p>
        </div>
      </div>
    </div>
  );
}
