
import { useDispatch } from "react-redux";
import SearchIcon from "../img/SearchIcon";
import { filterCalendar } from "../store/slices/calendarSlice";

function Search() {

  const dispatch = useDispatch();

  return (
    <div className="flex flex-row justify-start items-center">
      <SearchIcon />
      <input
        type="text"
        className="form-control rounded-2xl bg-background_dark font-semibold text-lg sm:text-xl px-2 py-2 sm:py-3 sm:ml-4 w-5/6"
        placeholder="Search"
        onChange={(e) => dispatch(filterCalendar(e.target.value))}
      ></input>
    </div>
  );
}

export default Search;
