import { useState } from "react";

function QuestionIcon(props) {

    const [color, setColor] = useState("fill-white");

    return (
        <svg className={`hover:fill-[#9D9D9D] hover:cursor-pointer ${color}`}
            width={41}
            height={41}
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            onClick={() => setColor("fill-click_question") }
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M20.5 3.154c-9.58 0-17.346 7.766-17.346 17.346S10.92 37.846 20.5 37.846 37.846 30.08 37.846 20.5 30.08 3.154 20.5 3.154zM0 20.5C0 9.178 9.178 0 20.5 0S41 9.178 41 20.5 31.822 41 20.5 41 0 31.822 0 20.5z"
                fill=""
                />
            <path
                d="M20.5 33.115a2.365 2.365 0 100-4.73 2.365 2.365 0 000 4.73z"
                fill=""
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.784 10.002a7.096 7.096 0 114.293 13.474v.178a1.577 1.577 0 11-3.154 0v-1.577A1.577 1.577 0 0120.5 20.5a3.942 3.942 0 10-3.942-3.942 1.577 1.577 0 11-3.154 0 7.096 7.096 0 014.38-6.556z"
                fill=""
            />
        </svg>
    );
}

export default QuestionIcon;