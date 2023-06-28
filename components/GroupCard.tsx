import React from "react";
import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";

export function GroupCard(props: any) {
  return (
    <div
      key={props.v.group.path}
      className="bg-background hover:bg-hover_color flex flex-row justify-between items-center sm:text-2xl px-7 py-5 my-2 rounded-3xl min-w-fit min-h-fit"
    >
      <p className="text-left text-xl font-medium w-56">{props.v.group.name}</p>
      <div
        className={`flex flex-row selected select-none whitespace-nowrap mr-2 rounded-xl w-fit text-right`}
      >
        <FavoriteIcon isActive={props.favorite} />
        <DownloadIcon fill={`rgba(256, 256, 256, 0.75)`} />
        {/*Import*/}
      </div>
    </div>
  );
}
