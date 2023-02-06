
import { useCopyToClipboard } from "usehooks-ts";

function GroupLink(props) {


    const [value, copy] = useCopyToClipboard();


    return (
        <div className="flex flex-row justify-between items-center text-lg sm:text-2xl font-semibold  border-8 border-border px-4 py-2 my-2 rounded-3xl ">
            <h1 className="my-2">{props.data.name}</h1>
            <h1
                className={`hover:cursor-pointer ${props.copied === props.data.name ? "selected" : "text-white  hover:text-hover_color"}`}
                onClick={() => {
                    copy(
                        "https://innohassle.campus.innopolis.university/cal/" +
                        props.data.file
                    )
                    props.setCopied(props.data.name);
                }
                }
            >
                {props.copied === props.data.name ? "Link copied" : "Copy link"}
            </h1>
        </div>
    );
}

export default GroupLink;
