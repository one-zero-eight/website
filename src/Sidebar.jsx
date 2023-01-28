import { icons, titles } from "./data/SidebarData";
import Logo from "./img/Logo";
import Option from "./Option";


function Sidebar() {
    return (
        <aside className=" bg-background flex flex-col items-center py-3 px-8 border-r-8 border-border">
            <Logo />
            <div className="flex flex-col mt-8 justify-between">

                {icons.map((item, index) => {
                    return <Option title={titles[index]} icon={item} />
                })}

            </div>
        </aside>
    );
}

export default Sidebar;