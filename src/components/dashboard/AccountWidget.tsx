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
      <div className="bg-inh-primary text-base-content/50 flex h-20 w-20 shrink-0 items-center justify-center overflow-clip rounded-full">
        {me.telegram?.photo_url ? (
          <img
            src={me.telegram.photo_url}
            alt="Your avatar"
            className="border-base-content/50 rounded-full border-2"
          />
        ) : (
          <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl @xl/account:text-6xl" />
        )}
      </div>
      <div className="flex flex-col justify-center overflow-x-hidden">
        <p className="text-xl wrap-break-word">{me.innopolis_sso?.name}</p>
        <p className="text-base-content/75 overflow-hidden text-sm text-ellipsis">
          {me.innopolis_sso?.email}
          <span className="text-sm">{roles && ` (${roles})`}</span>
        </p>
      </div>
    </div>
  );
}
