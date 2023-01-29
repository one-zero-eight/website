import { Popover } from "@headlessui/react";
import QuestionIcon from "../img/QuestionIcon";

function ImportPopover() {


    return (
        <div className="flex flex-row justify-start items-center">
            <h2 className="font-semibold text-2xl mr-4">How to import</h2>
            <Popover className="relative  w-2/3">
                <Popover.Button ><QuestionIcon /></Popover.Button>
                <Popover.Panel className="absolute  bg-background_dark p-4 rounded-lg shadow-lg">
                    <h1>HOW TO IMPORT:</h1>
                    <ul className="list-decimal pl-8">
                        <li key={1}>COPY THE LINK FOR YOUR GROUP.</li>
                        <li key={2}>OPEN YOUR CALENDAR SETTINGS ADD THE CALENDAR BY URL:</li>
                        <ul key={3} className="list-disc pl-4">
                            <li>
                                <a className="underline" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" >
                                    GOOGLE CALENDAR
                                </a>
                            </li>
                        </ul>
                        <li key={4}>PASTE THE LINK AND CLICK ADD.</li>
                    </ul>
                </Popover.Panel>
            </Popover>
        </div>
    );
}

export default ImportPopover;