"use client";
import { GroupCard } from "@/components/GroupCard";
import ScheduleDialog from "@/components/ScheduleDialog";
import SearchBar from "@/components/SearchBar";
import { useEventGroupsListEventGroups } from "@/lib/events";
import { getTypeInfoBySlug } from "@/lib/events-view-config";
import { ymEvent } from "@/lib/tracking/YandexMetrika";
import React, { useState } from "react";
import CategoriesDropdown from "./CategoriesDropdown";
import FilterDropdown from "./FilterDropdown";
import SignInPopup from "@/components/SignInPopup";

export type ScheduleListProps = {
  category: string;
};

export default function ScheduleList({ category }: ScheduleListProps) {
  const typeInfo = getTypeInfoBySlug(category);
  const { data } = useEventGroupsListEventGroups();

  const [filters, setFilters] = useState<{ [key: string]: string | undefined }>(
    {}
  );
  const [search, setSearch] = useState("");
  const [selectedGroupFile, setSelectedGroupFile] = useState("");
  const [dialogOpened, setDialogOpened] = useState(false);
  const [signInOpened, setSignInOpened] = useState(false);

  // Apply filters
  const groups = data?.groups
    .filter((v) => v.type === typeInfo?.id)
    .filter((v) =>
      Object.entries(filters).every(
        ([filterAlias, filterValue]) =>
          filterValue === undefined ||
          (v.satellite && v.satellite[filterAlias] === filterValue)
      )
    )
    .filter((v) =>
      v.name?.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    )
    .sort((a, b) => {
      if (
        typeInfo?.grouping === undefined ||
        a.satellite === undefined ||
        b.satellite === undefined
      )
        return 0;
      if (a.satellite[typeInfo.grouping] === b.satellite[typeInfo.grouping])
        return 0;
      return a.satellite[typeInfo.grouping] > b.satellite[typeInfo.grouping]
        ? 1
        : -1;
    });

  let lastGroup: string | undefined = undefined;

  return (
    <>
      <div className="flex flex-row flex-wrap gap-4 mt-4 justify-center xl:justify-normal">
        <CategoriesDropdown category={category} />
        {typeInfo?.filters.map((v) => (
          <FilterDropdown
            key={v.alias}
            typeFilter={v}
            selected={filters[v.alias] || ""}
            setSelected={(value) =>
              setFilters((prev) => ({ ...prev, [v.alias]: value || undefined }))
            }
          />
        ))}
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={"Find the group..."}
          width={450}
        />
      </div>

      <hr className="border-b-1 w-full mt-4 border-border"></hr>

      <div className="flex flex-wrap justify-left gap-y-2 gap-x-10 content-start place-items-center justify-items-stretch overflow-auto scrollbar-hide h-full w-full px-0 md:px-12 mt-4">
        {groups?.map((group) => {
          let groupTitle = undefined;
          if (
            typeInfo?.grouping !== undefined &&
            group.satellite &&
            group.satellite[typeInfo.grouping] !== lastGroup
          ) {
            groupTitle = (
              <div className="text-3xl font-bold w-full mt-8 mb-4 ml-4">
                {group.satellite[typeInfo.grouping]}
              </div>
            );
            lastGroup = group.satellite[typeInfo.grouping];
          }
          return (
            <React.Fragment key={group.path}>
              {groupTitle}
              <GroupCard
                key={group.path}
                group={group}
                askToSignIn={() => {
                  setSignInOpened(true);
                }}
                onImportClick={() => {
                  ymEvent("button-import", { scheduleFile: group.path });
                  setSelectedGroupFile(group.path);
                  setDialogOpened(true);
                }}
              />
            </React.Fragment>
          );
        })}
      </div>

      <ScheduleDialog
        groupFile={selectedGroupFile}
        opened={dialogOpened}
        close={() => setDialogOpened(false)}
      />

      <SignInPopup
        header={"Sign in to get access"}
        description={
          "Save your favorite schedule in the dashboard with your Innopolis account."
        }
        opened={signInOpened}
        close={() => setSignInOpened(false)}
      />
    </>
  );
}
