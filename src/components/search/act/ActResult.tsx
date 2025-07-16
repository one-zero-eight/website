import { searchTypes } from "@/api/search";
import clsx from "clsx";

export function ActResult({
  response,
}: {
  response: searchTypes.SchemaActResponses;
}) {
  const answer = response.answer;

  return (
    <div
      tabIndex={0}
      className={clsx(
        "flex flex-col rounded-lg !border border-gray-400 bg-floating p-4 hover:bg-primary-hover",
      )}
    >
      {answer}
    </div>
  );
}
