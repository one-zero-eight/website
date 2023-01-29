import { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

function GroupLink(props) {

    const [linkColor, setLinkColor] = useState("text-white");

    const [value, copy] = useCopyToClipboard();

    return (
        <div className="flex flex-row justify-between items-center text-2xl font-semibold w-5/6 border-8 border-border px-4 py-2 my-2 rounded-3xl">
            <h1 className="my-2">{props.data.name}</h1>
            <h1
                className={`hover:text-hover_color hover:cursor-pointer ${linkColor}`}
                onClick={() => {
                    copy(
                        "https://innohassle.campus.innopolis.university/cal/" +
                        props.data.file
                    )
                    setLinkColor("text-click_color");
                }
                }
            >
                Copy link
            </h1>
        </div>
    );
}

export default GroupLink;
