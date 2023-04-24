import GroupLink from "./UI/GroupLink";
import Instruction from "./UI/Instruction";
import Droplist from "./UI/Droplist";
import Search from "./UI/Search";
import useGetCalendar from "./hooks/useGetCalendar";
import { useSelector } from "react-redux";

function Calendar() {
  const calendar = useGetCalendar();

  const groups = useSelector((state) => state.calendarSlice.calendar);

  return (
    <main className="flex flex-col bg-background grow text-white h-screen">
      <div className="flex flex-col justify-center items-center p-5">
        <div className="flex flex-row justify-center mt-3">
          <h1 className="text-4xl sm:text-6xl font-bold">Schedule</h1>
        </div>

        <Instruction />

        <div className="flex flex-row justify-between items-center sm:mt-10 mt-6 sm:px-8 w-full">
          <Search />

          <Droplist />
        </div>
      </div>
      <hr className="border-b-8 border-border"></hr>

      <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-y-2 gap-x-4 grid-cols-1 auto-cols-auto content-start  place-items-center justify-items-stretch overflow-auto scrollbar-hide h-full w-full px-12 mt-4">
        {groups.map((group) => {
          return <GroupLink data={group} />;
        })}
      </div>
    </main>
  );
}

export default Calendar;
