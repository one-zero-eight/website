import { CreateMeetingButton } from "./CreateMeetingButton.tsx";

export function MeetingsMobileBar() {
  return (
    <div className="border-base-300 bg-base-200 fixed bottom-12 flex w-full flex-col rounded-t-xl border-b p-3 md:hidden">
      <CreateMeetingButton className="w-full">
        Create meeting
      </CreateMeetingButton>
    </div>
  );
}
