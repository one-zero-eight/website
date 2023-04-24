import { useDispatch, useSelector } from "react-redux";
import { useCopyToClipboard } from "usehooks-ts";
import { setCopied } from "../store/slices/calendarSlice";

function GroupLink(props) {
  const [value, copy] = useCopyToClipboard();

  const dispatch = useDispatch();

  const copied = useSelector((state) => state.calendarSlice.copied);

  return (
    <div className="flex flex-row justify-between items-center text-lg sm:text-2xl font-semibold  border-8 border-border px-4 py-2 my-2 rounded-3xl ">
      <h1 className="my-2">{props.data.name}</h1>
      <h1
        className={`hover:cursor-pointer ${
          copied === props.data.name
            ? "selected"
            : "text-white  hover:text-hover_color"
        }`}
        onClick={() => {
          copy(
            "https://innohassle.campus.innopolis.university/cal/" +
              props.data.file
          );
          dispatch(setCopied(props.data.name));
        }}
      >
        {copied === props.data.name ? "Link copied" : "Copy link"}
      </h1>
    </div>
  );
}

export default GroupLink;
