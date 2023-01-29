import { useState } from "react";
import { groupsData } from "../data/CalendarData";
import CrossIcon from "../img/CrossIcon";
import SearchIcon from "../img/SearchIcon";
import SearchIcon_bar from "../img/SearchIcon_bar";

function Search(props) {

    const [searchVisible, setSearchVisible] = useState(false);

    const search = (e) => {
        props.setGroups(groupsData.groups.filter((group) => {
            return group.name.includes(e.target.value)
        })
        )
    }

    return (
        <div className="flex flex-row justify-between items-center w-1/4">
            <div className={`flex flex-row justify-start ${!searchVisible ? "" : "hidden"}`}>
                <SearchIcon setSearchVisible={setSearchVisible} />
                <SearchIcon_bar />
            </div>
            <div className={`flex flex-row justify-end items-center ${searchVisible ? "" : "hidden"}`}>
                <CrossIcon setSearchVisible={setSearchVisible} />
                <input type="text" className="form-control rounded-2xl bg-background_dark font-semibold text-xl px-2 py-3" placeholder="Search" onChange={search}>

                </input>
            </div>
        </div>
    );
}

export default Search;