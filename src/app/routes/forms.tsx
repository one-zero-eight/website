import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

export type SearchParams = {
  form: string | undefined;
};

export const Route = createFileRoute("/forms")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      form: typeof search.form === "string" ? search.form : undefined,
    };
  },

  component: function PageComponent() {
    const { form } = Route.useSearch();
    const { me } = useMe();

    useEffect(() => {
      if (!form || !me) return;
      // Получаем email пользователя
      const email = me.innopolis_sso?.email;
      if (!email) return;
      // Добавляем email к ссылке
      try {
        const url = new URL(form);
        url.searchParams.append("email", email);
        window.location.replace(url.toString());
      } catch {
        // Если некорректная ссылка, ничего не делаем
      }
    }, [form, me]);

    if (!form) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">Некорректная ссылка</h2>
          <p className="text-lg text-contrast/70">
            Параметр формы не передан или некорректен.
          </p>
        </div>
      );
    }

    if (!me) {
      return <AuthWall />;
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Helmet>
          <title>Переадресация на форму</title>
        </Helmet>
        <h2 className="mb-2 text-2xl font-bold">Переадресация…</h2>
        <p className="text-lg text-contrast/70">
          Секундочку, мы перенаправляем вас на форму…
        </p>
      </div>
    );
  },
});
