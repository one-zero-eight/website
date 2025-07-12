import { DefaultButton } from "@/components/search/DefaultButton";

type Filter = {
  displayName: string;
  internalName: string;
};

type Props = {
  open: boolean;
  filters: Record<string, Filter[]>;
  selected: Record<string, Record<string, boolean>>;
  checks: (group: string, value: string) => void;
  onApply: () => void;
  onClose: () => void;
};

const SelectSourcesFilterModal = ({
  open,
  filters,
  selected,
  checks,
  onApply,
  onClose,
}: Props) => {
  if (!open) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-400 bg-floating p-4 text-black shadow-xl dark:text-white">
      {Object.entries(filters).map(([group, values]) => (
        <div key={group}>
          <div className="flex flex-col gap-1 pr-1">
            {values.map((value) => (
              <label
                key={value.internalName}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected[group][value.internalName]}
                  onChange={() => checks(group, value.internalName)}
                  className="cursor-pointer accent-purple-600"
                />
                {value.displayName}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-center">
        <DefaultButton
          content="Done"
          onClick={() => {
            onApply();
            onClose();
          }}
        />
      </div>
    </div>
  );
};

export default SelectSourcesFilterModal;
