import { groupsData } from "./data/CalendarData";
import GroupLink from "./UI/GroupLink";
import ImportPopover from "./UI/ImportPopover";
import Droplist from "./UI/Droplist";
import { useState } from "react";
import Search from "./UI/Search";

function Calendar() {

    const [groups, setGroups] = useState(groupsData.groups);


    return (
        <main className="flex flex-col bg-background w-full text-white h-screen">
            <div className="p-5">

                <ImportPopover />

                <div className="flex flex-row justify-center mt-3">
                    <h1 className="text-6xl font-bold">Schedule</h1>
                </div>
                <div className="flex flex-row justify-between mt-3">

                    <Search groups={groups} setGroups={setGroups} />

                    <Droplist groups={groups} setGroups={setGroups} />
                </div>
            </div>
            <hr className="border-b-8 border-border"></hr>

            <div className="flex flex-col justify-start items-center overflow-auto scrollbar-hide h-full mt-4">
                {groups.map((group) => {
                    return <GroupLink data={group} />
                })}
            </div>



        </main>
    );
}

export default Calendar;