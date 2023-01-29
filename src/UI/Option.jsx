function Option(props) {
    return (
        <div className="flex flex-row text-white items-center mt-3">
            {props.icon}
            <h1 className="font-semibold text-xl ml-2">{props.title}</h1>
        </div>
    );
}

export default Option;