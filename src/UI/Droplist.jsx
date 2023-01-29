import { groupsData } from "../data/CalendarData";

function Droplist(props) {

    const filter = (e) => {

        props.setGroups(groupsData.groups.filter((group) => {
            return group.name.includes(e.target.value)
        }));
    }

    return (

        <select onChange={filter}
            className="form-select appearance-none bg-background bg-no-repeat font-semibold text-3xl p-2">
            <option value={""} className="p-8" selected>Course</option>
            <option value={"B22"}>BS Year 1</option>
            <option value={"21"}>BS Year 2</option>
            <option value={"B20"}>BS Year 3</option>
            <option value={"B19"}>BS Year 4</option>
            <option value={"M22"}>MS Year 1</option>
        </select>
    );
}

export default Droplist;