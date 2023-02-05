import { useState } from "react";
import { icons, titles } from "./data/SidebarData";
import Logo from "./img/Logo";
import Section from "./UI/Section";


function Sidebar() {

    const [sectionSelected, setSectionSelected] = useState("Schedule");

    return (
        <aside className="hidden sm:flex bg-background flex-col items-center py-3 px-4 border-r-8 border-border">
            <Logo />
            <div className="flex flex-col mt-10">

                {icons.map((item, index) => {
                    return <Section title={titles[index]} icon={item} sectionSelected={sectionSelected} />
                })}

            </div>
        </aside>
    );
}

export default Sidebar;