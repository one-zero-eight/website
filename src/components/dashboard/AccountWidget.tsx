import { useMe } from "@/api/accounts/user.ts";

export function AccountWidget() {
  const { me } = useMe();

  if (!me) return null;

  const roles = [
    me.innopolis_sso?.is_student && "Student",
    me.innopolis_sso?.is_staff && "Staff",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex max-w-full flex-row gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-clip rounded-full bg-primary text-contrast/50">
        {me.telegram?.photo_url ? (
          <img
            src={me.telegram.photo_url}
            alt="Your avatar"
            className="rounded-full border-2 border-contrast/50"
          />
        ) : (
          <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl @xl/account:text-6xl" />
        )}
      </div>
      <div className="flex flex-col justify-center overflow-x-hidden">
        <p className="break-words text-xl">{me.innopolis_sso?.name}</p>
        <p className="overflow-hidden overflow-ellipsis text-sm text-contrast/75">
          {me.innopolis_sso?.email}
          <span className="text-sm">{roles && ` (${roles})`}</span>
        </p>
      </div>
    </div>
  );
}
