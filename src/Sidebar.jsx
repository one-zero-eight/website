import { useState } from "react";
import { icons, titles } from "./data/SidebarData";
import Logo from "./img/Logo";
import Option from "./UI/Option";


function Sidebar() {

    const [sectionSelected, setSectionSelected] = useState("Schedule");

    return (
        <aside className="hidden sm:flex bg-background flex-col items-center py-3 px-8 border-r-8 border-border">
            <Logo />
            <div className="flex flex-col mt-8 justify-between">

                {icons.map((item, index) => {
                    return <Option title={titles[index]} icon={item} sectionSelected={sectionSelected} />
                })}

            </div>
        </aside>
    );
}

export default Sidebar;