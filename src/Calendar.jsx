import { groupsData } from "./data/CalendarData";
import GroupLink from "./GroupLink";
import QuestionIcon from "./img/QuestionIcon";
import SearchIcon from "./img/SearchIcon";

function Calendar() {
    return (
        <main className="flex flex-col bg-background w-full text-white h-screen">
            <div className="p-5">
                <div className="flex flex-row justify-start items-center">
                    <h2 className="font-semibold text-2xl mr-2">How to import</h2>
                    <QuestionIcon />
                </div>
                <div className="flex flex-row justify-center mt-3">
                    <h1 className="text-6xl font-bold">Schedule</h1>
                </div>
                <div className="flex flex-row justify-between mt-3">
                    <SearchIcon />
                    <select className="form-select appearance-none bg-background bg-no-repeat font-semibold text-2xl p-2">
                        <option selected>Course</option>
                        <option>BS Year 1</option>
                        <option>BS Year 2</option>
                        <option>BS Year 3</option>
                        <option>BS Year 4</option>
                        <option>MS Year 1</option>
                    </select>
                </div>
            </div>
            <hr className="border-b-8 border-border"></hr>

            <div className="flex flex-col justify-start items-center overflow-auto scrollbar-hide h-full mt-4">
                {groupsData.groups.map((group) => {
                    return <GroupLink data={group} />
                })}
            </div>


        </main>
    );
}

export default Calendar;