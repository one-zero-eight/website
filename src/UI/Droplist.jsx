import { groupsData } from "../data/CalendarData";
import { Popover } from '@headlessui/react'
import DropListIcon from "../img/DropListIcon";
import DropListCloseIcon from "../img/CloseDropListIcon";
import { useState } from "react";

function Droplist(props) {


    const [selected, setSelected] = useState("Course");

    const filter = (e) => {

        props.setGroups(groupsData.groups.filter((group) => {
            return group.name.includes(e.target.value)
        }));


        setSelected(e.target.innerText);
    }

    return (
        <Popover className="relative">
            <Popover.Button>
                <div className="flex flex-row justify-center items-center  p-2">
                    <h3 className="text-2xl mr-4"> {selected}</h3>

                    <DropListIcon />
                </div>

            </Popover.Button>

            <Popover.Panel className="absolute z-10">
                <div className="flex flex-col justify-center items-end bg-background_dark rounded-xl pb-6">
                    <DropListCloseIcon />
                    <Popover.Button className="text-2xl py-1 px-4 hover:bg-section_g_end" value={"B22"} onClick={(e) => filter(e)}>BS Year 1</Popover.Button>
                    <Popover.Button className="text-2xl py-1 px-4 hover:bg-section_g_end" value={"21"} onClick={(e) => filter(e)}>BS Year 2</Popover.Button>
                    <Popover.Button className="text-2xl py-1 px-4 hover:bg-section_g_end" value={"B20"} onClick={(e) => filter(e)}>BS Year 3</Popover.Button>
                    <Popover.Button className="text-2xl py-1 px-4 hover:bg-section_g_end" value={"B19"} onClick={(e) => filter(e)}>BS Year 4</Popover.Button>
                    <Popover.Button className="text-2xl py-1 px-4 hover:bg-section_g_end" value={"M22"} onClick={(e) => filter(e)}>MS Year 1</Popover.Button>
                </div>

                <img src="/solutions.jpg" alt="" />
            </Popover.Panel>
        </Popover>
    );
}

export default Droplist;