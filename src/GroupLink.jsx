function GroupLink(props) {
    return (
        <div className="flex flex-row justify-between items-center text-2xl font-semibold w-5/6 border-8 border-border px-4 py-2 my-2 rounded-3xl">
            <h1 className="my-2">{props.data.name}</h1>
            <h1 className="">Copy link</h1>
        </div>
    );
}

export default GroupLink;