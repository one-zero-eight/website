import { $maps } from "@/api/maps";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

export function MapsPageTabs() {
  const navigate = useNavigate();
  const { data: scenes } = $maps.useQuery("get", "/scenes/");
  const { sceneId, q } = useLocation({ select: ({ search }) => search });
  const [searchText, setSearchText] = useState(q ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Show current search query
    setSearchText(q ?? "");
  }, [q]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.focus();
    // Set search query in URL
    if (searchText) {
      navigate({ to: "/maps", search: { q: searchText, sceneId } });
    }
  };

  return (
    <div className="flex shrink-0 flex-col whitespace-nowrap @3xl/content:flex-row">
      <form
        onSubmit={onSubmit}
        className="flex items-center border-b-[1px] border-b-secondary-hover px-2 pb-[1px] focus-within:border-b-2 focus-within:border-b-focus focus-within:pb-0"
      >
        <input
          ref={inputRef}
          placeholder="Search any place"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="min-w-0 grow bg-transparent px-2 py-1 outline-none"
        />
        <button
          type="submit"
          tabIndex={-1} // Do not allow to focus on this button
          className="icon-[material-symbols--search-rounded] shrink-0 text-2xl text-secondary-hover"
        />
      </form>

      <div className="flex grow flex-row overflow-x-auto whitespace-nowrap">
        <div className="w-2 shrink-0 border-b-[1px] border-b-secondary-hover @3xl/content:w-1" />
        {scenes?.map((scene) => (
          <Link
            key={scene.scene_id}
            to="/maps"
            search={{ sceneId: scene.scene_id }}
            className={clsx(
              "px-2 py-1",
              scene.scene_id === sceneId
                ? "border-b-2 border-b-focus"
                : "border-b-[1px] border-b-secondary-hover",
            )}
          >
            {scene.title}
          </Link>
        ))}
        <div className="min-w-2 grow border-b-[1px] border-b-secondary-hover" />
      </div>
    </div>
  );
}
