import { groupsData } from "../data/CalendarData";
import SearchIcon from "../img/SearchIcon";

function Search(props) {
  const search = (e) => {
    props.setGroups(
      groupsData.groups.filter((group) => {
        return group.name.includes(e.target.value.toUpperCase());
      })
    );
  };

  return (
    <div className="flex flex-row justify-start items-center">
      <SearchIcon />
      <input
        type="text"
        className="form-control rounded-2xl bg-background_dark font-semibold text-lg sm:text-xl px-2 py-2 sm:py-3 sm:ml-4 w-5/6"
        placeholder="Search"
        onChange={search}
      ></input>
    </div>
  );
}

export default Search;
