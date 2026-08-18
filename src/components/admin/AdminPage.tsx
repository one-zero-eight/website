import { ImpersonateCard } from "@/components/admin/ImpersonateCard.tsx";
import { useNavigate } from "@tanstack/react-router";

const adminLinks = [
  "https://dev.innohassle.ru/grafana/",
  "https://api.innohassle.ru",
  "https://innohassle.ru/account/token",
  "https://innohassle.ru/account/connect-telegram?reconnect=true",
  "https://storage.innohassle.ru/minio/ui",
  "https://sport.innopolis.university/admin/",
  "https://uptime.dofi4ka.ru",
];

export function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-4 p-4">
        <h2 className="text-xl font-medium">Search users</h2>
        <input
          autoComplete="off"
          spellCheck={false}
          className="input input-bordered w-full"
          placeholder="Name or email..."
          onChange={(event) => {
            const q = event.target.value;
            if (!q) return;
            navigate({ to: "/admin/users", search: { q } });
          }}
        />
      </section>
      <ImpersonateCard />
      <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-3 p-4">
        <h2 className="text-xl font-medium">Links</h2>
        <ul className="flex min-w-0 flex-col gap-2">
          {adminLinks.map((href) => (
            <li key={href} className="min-w-0">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="link text-primary block truncate"
              >
                {href}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
