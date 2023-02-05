function Section(props) {



    return (
        <div className="flex flex-row justify-center mt-4">
            {props.icon}

            <h1 className={`flex grow font-semibold text-xl items-center w-min 
            ${props.sectionSelected === props.title ? 'selected' : 'text-inactive'} `}>
                {props.title}</h1>
        </div>
    );
}

export default Section;