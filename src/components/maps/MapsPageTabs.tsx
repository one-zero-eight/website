import { $maps } from "@/api/maps";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

export function MapsPageTabs() {
  const navigate = useNavigate();
  const { data: scenes } = $maps.useQuery("get", "/scenes/");
  const { scene: sceneId, q } = useLocation({ select: ({ search }) => search });
  const [searchText, setSearchText] = useState(q ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Show current search query
    setSearchText(q ?? "");
  }, [q]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.blur();
    // Set search query in URL
    if (searchText) {
      navigate({ to: "/maps", search: { q: searchText, scene: sceneId } });
    }
  };

  return (
    <div className="flex shrink-0 flex-col whitespace-nowrap @3xl/content:flex-row">
      <form
        onSubmit={onSubmit}
        className="border-b-inh-secondary-hover focus-within:border-b-primary flex items-center border-b px-2 pb-px focus-within:border-b-2 focus-within:pb-0"
      >
        <input
          ref={inputRef}
          placeholder="Search any place"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="min-w-0 grow bg-transparent px-2 py-1 outline-hidden"
        />
        <button
          type="submit"
          tabIndex={-1} // Do not allow to focus on this button
          className="icon-[material-symbols--search-rounded] text-inh-secondary-hover shrink-0 text-2xl"
        />
      </form>

      <div className="flex grow flex-row overflow-x-auto whitespace-nowrap">
        <div className="border-b-inh-secondary-hover w-2 shrink-0 border-b @3xl/content:w-1" />
        {scenes?.map((scene, i) => (
          <Link
            key={scene.scene_id}
            to="/maps"
            search={{ scene: scene.scene_id }}
            className={clsx(
              "px-2 py-1",
              scene.scene_id === sceneId || (sceneId === undefined && i === 0)
                ? "border-b-primary border-b-2"
                : "border-b-inh-secondary-hover border-b",
            )}
          >
            {scene.title}
          </Link>
        ))}
        <div className="border-b-inh-secondary-hover min-w-2 grow border-b" />
      </div>
    </div>
  );
}
