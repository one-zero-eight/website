import { Popover, Transition } from "@headlessui/react";
import { useState } from "react";

function Section(props) {
    const [isShowing, setIsShowing] = useState(false);

    return (
        <Popover className="relative appearance-none">
            <Popover.Button
                onMouseEnter={() => setIsShowing(true)}
                onMouseLeave={() => setIsShowing(false)}
            >
                <div className="flex flex-row justify-center mt-4">
                    {props.icon}
                    <h1
                        className={`flex grow font-semibold text-xl items-center w-min 
            ${props.sectionSelected === props.title
                                ? "selected"
                                : "text-inactive"
                            } `}
                    >
                        {props.title}
                    </h1>
                </div>
            </Popover.Button>

            <Transition className="absolute z-10"
                show={isShowing && props.sectionSelected !== props.title}
                onMouseEnter={() => setIsShowing(true)}
                onMouseLeave={() => setIsShowing(false)}
                enter="transition duration-100 ease-out "
                enterFrom="transform scale-95 opacity-0 "
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
            >
                <Popover.Panel>
                    <h1 className="flex justify-center items-center bg-background_dark text-white text-lg w-max px-8 py-2 rounded-md">
                    Coming soon
                    </h1>
                </Popover.Panel>
            </Transition>
        </Popover>
    );
}

export default Section;
