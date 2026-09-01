import { Topbar } from "@/components/layout/Topbar.tsx";
import { OnboardingPage } from "@/components/onboarding/OnboardingPage.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with_menu/start")({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>,
  ): { step: 1 | 2 | 3 | 4 | 5 } => {
    const parsedStep = Number(search.step);
    const step =
      parsedStep >= 1 && parsedStep <= 5
        ? (parsedStep as 1 | 2 | 3 | 4 | 5)
        : 1;

    return {
      ...search,
      step,
    };
  },
});

function RouteComponent() {
  const { step } = Route.useSearch();

  return (
    <>
      <Helmet>
        <title>Get started</title>
        <meta
          name="description"
          content="Sign in and connect Telegram to start using InNoHassle."
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Topbar title="Get started" />
      <OnboardingPage step={step} />
    </>
  );
}
