import { Link } from "@tanstack/react-router";
import { useMe } from "@/api/accounts/user.ts";

export function TelegramReconnectWidget() {
  const { me } = useMe();
  if (!me?.telegram_update_data || me?.telegram_update_data.success)
    return null;

  return (
    <div className="group bg-inh-primary rounded-box flex flex-row gap-4 px-4 py-4 shadow-lg">
      <span className="icon-[uil--telegram-alt] hidden w-12 shrink-0 animate-pulse text-5xl text-orange-500 sm:block" />
      <div className="flex flex-col">
        <div className="flex items-center text-lg font-semibold text-orange-500">
          <span className="icon-[uil--telegram-alt] mr-2 shrink-0 animate-pulse text-3xl text-orange-500 sm:hidden" />
          Action Required
        </div>
        <Link
          to="/account/connect-telegram"
          search={{ reconnect: true }}
          className="mt-2 flex w-fit items-center gap-1 text-orange-500 underline hover:text-green-500"
        >
          <span className="icon-[material-symbols--arrow-forward-rounded] text-base" />
          Reconnect your Telegram now
        </Link>
      </div>
    </div>
  );
}
