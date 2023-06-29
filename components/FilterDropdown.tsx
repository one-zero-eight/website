"use client";
import { Schedule } from "@/lib/schedule/api";
import React from "react";
import { Dropdown } from "@/components/Dropdown";
import DropdownButton from "@/components/DropdownButton";

function FilterDropdown({
  schedule,
  filterAlias,
  selected,
  setSelected,
}: {
  schedule: Schedule;
  filterAlias: string;
  selected: string;
  setSelected: (v: string) => void;
}) {
  const variants = schedule.calendars
    .map((v) => v[filterAlias])
    .filter((v, index, array) => array.indexOf(v) === index)
    .sort();
  const filterTitle = schedule.filters.filter((v) => v.alias === filterAlias)[0]
    .title;

  return (
    <Dropdown optionInfo={selected || filterTitle}>
      <DropdownButton
        title={"All"}
        onClick={(e) => setSelected((e.target as any).value)}
      />
      {variants.map((v) => (
        <DropdownButton
          title={v}
          key={v}
          onClick={(e) => setSelected((e.target as any).value)}
        />
      ))}
    </Dropdown>
  );
}

export default FilterDropdown;
