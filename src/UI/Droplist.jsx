
import { Popover } from '@headlessui/react'
import DropListIcon from "../img/DropListIcon";
import DropListCloseIcon from "../img/CloseDropListIcon";
import { useState } from "react";
import { useDispatch } from 'react-redux';
import { filterCalendar } from '../store/slices/calendarSlice';

function Droplist() {

    const [selected, setSelected] = useState("Course");

    const dispatch = useDispatch();

    const filter = (e) => {
        dispatch(filterCalendar(e.target.value));
        setSelected(e.target.innerText);
    }

    return (
        <Popover className="relative text-lg sm:text-2xl sm:w-auto pl-2 sm:pl-0 w-1/2">
            <Popover.Button>
                <div className="flex flex-row items-center">
                    <h3 className="px-2 mr-4"> {selected}</h3>

                    <DropListIcon />
                </div>

            </Popover.Button>

            <Popover.Panel className="absolute z-10">
                <div className="flex flex-col justify-center items-center bg-background_dark rounded-xl pb-6">
                    <div className="flex flex-row justify-center items-center">
                        <h3 className="invisible px-2 mr-4"> {selected}</h3>
                        <DropListCloseIcon />
                    </div>

                    <Popover.Button className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end" value={""} onClick={(e) => filter(e)}>Course</Popover.Button>
                    <Popover.Button className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end" value={"B22"} onClick={(e) => filter(e)}>BS Year 1</Popover.Button>
                    <Popover.Button className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end" value={"21"} onClick={(e) => filter(e)}>BS Year 2</Popover.Button>
                    <Popover.Button className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end" value={"B20"} onClick={(e) => filter(e)}>BS Year 3</Popover.Button>
                    <Popover.Button className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end" value={"B19"} onClick={(e) => filter(e)}>BS Year 4</Popover.Button>
                    <Popover.Button className="sm:py-1 py-2 px-4 w-full hover:bg-section_g_end" value={"M22"} onClick={(e) => filter(e)}>MS Year 1</Popover.Button>
                </div>
            </Popover.Panel>
        </Popover>
    );
}

export default Droplist;