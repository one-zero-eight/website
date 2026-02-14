import { useMe } from "@/api/accounts/user.ts";
import { Link } from "@tanstack/react-router";

export function AccountWidget() {
  const { me } = useMe();

  if (!me) return null;

  const roles = [
    me.innopolis_info?.is_staff && "Staff",
    me.innopolis_info?.is_student && "Student",
    me.innopolis_info?.is_college && "College",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex max-w-full flex-row gap-4">
      <div className="bg-base-200 text-base-content/50 flex h-20 w-20 shrink-0 items-center justify-center overflow-clip rounded-full">
        {me.telegram_info?.photo_url ? (
          <img
            src={me.telegram_info.photo_url}
            alt="Your avatar"
            className="border-base-content/50 rounded-full border-2"
          />
        ) : (
          <span className="icon-[material-symbols--sentiment-satisfied-outline-rounded] text-5xl @xl/account:text-6xl" />
        )}
      </div>
      <div className="flex flex-col justify-center overflow-x-hidden">
        <p className="text-xl wrap-break-word">{me.innopolis_info?.name}</p>
        <p className="text-base-content/75 overflow-hidden text-sm text-ellipsis">
          {me.innopolis_info?.email}
          <span className="text-sm">{roles && ` (${roles})`}</span>
        </p>
        <p className="text-base-content/75 overflow-hidden text-sm text-ellipsis">
          {me.telegram_info ? (
            <>
              @{me.telegram_info?.username || "no Telegram alias"}
              {me?.telegram_update_data &&
                !me?.telegram_update_data.success && (
                  <Link
                    to="/account/connect-telegram"
                    search={{ reconnect: true }}
                    className="link text-primary ml-1 text-sm"
                  >
                    Reconnect Telegram
                  </Link>
                )}
            </>
          ) : (
            <Link
              to="/account/connect-telegram"
              className="link text-primary text-sm"
            >
              Connect Telegram
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
