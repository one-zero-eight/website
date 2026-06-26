import { Find108Bus } from "@/components/find-108/Find108Bus.tsx";
import { Find108Illustration } from "@/components/find-108/Find108Illustration.tsx";
import { Find108Glyph } from "@/components/find-108/Find108Glyph.tsx";
import {
  FIND108_SIDE_COLUMN,
  Find108SideRails,
} from "@/components/find-108/Find108Decorations.tsx";
import {
  Find108Modal,
  Find108ModalButton,
} from "@/components/find-108/Find108Modal.tsx";
import { Find108Number } from "@/components/find-108/Find108Number.tsx";
import { Find108Rover } from "@/components/find-108/Find108Rover.tsx";
import { Find108University } from "@/components/find-108/Find108University.tsx";
import {
  FIND108_ASSIGNMENT_LABEL,
  FIND108_ASSIGNMENT_TITLE,
  FIND108_BODY_TEXT,
  FIND108_DOTTED_H,
  FIND108_HEADER_TEXT,
  FIND108_LINK_CLASS,
  FIND108_SECTION_TITLE,
} from "@/components/find-108/find108-theme.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useCallback, useEffect, useRef, useState } from "react";

const HIDDEN_NUMBERS = [
  "innopolis-age",
  "students",
  "clubs",
  "services",
  "rover",
  "bus",
] as const;

type HiddenNumberId = (typeof HIDDEN_NUMBERS)[number];

const NUMBER_VALUES: Record<HiddenNumberId, string> = {
  "innopolis-age": "14",
  students: "1\u00a0860",
  clubs: "60",
  services: "16",
  rover: "А-242",
  bus: "Иннополис",
};

function Find108SectionHeader({ children }: { children: string }) {
  return <h2 className={FIND108_SECTION_TITLE}>{children}</h2>;
}

function Find108SideColumn() {
  return <div className="hidden sm:block" />;
}

export function Find108Page() {
  const { showSuccess, toasts, hideToast } = useToast();
  const clearToasts = useCallback(() => {
    for (const toast of toasts) {
      hideToast(toast.id);
    }
  }, [hideToast, toasts]);
  const revealedRef = useRef<Set<HiddenNumberId>>(new Set());
  const [revealed, setRevealed] = useState<Set<HiddenNumberId>>(
    () => new Set(),
  );
  const [rulesOpen, setRulesOpen] = useState(true);
  const [victoryOpen, setVictoryOpen] = useState(false);

  const total = HIDDEN_NUMBERS.length;
  const found = revealed.size;
  const isComplete = found === total;

  useEffect(() => {
    if (!isComplete) return;
    clearToasts();
    setVictoryOpen(true);
  }, [clearToasts, isComplete]);

  const handleReveal = (id: HiddenNumberId) => {
    if (revealedRef.current.has(id)) return;

    const next = new Set(revealedRef.current);
    next.add(id);
    revealedRef.current = next;
    setRevealed(next);

    if (next.size >= total) {
      clearToasts();
      return;
    }

    clearToasts();
    showSuccess("Число 108", `${next.size} из ${total}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black text-white/85">
      <Find108Modal
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        title="Как играть"
      >
        <p className="leading-relaxed text-white/75">
          На странице все числа заменены на <Find108Glyph />. Нажимайте на
          каждое вхождение <Find108Glyph /> в тексте, чтобы раскрыть настоящие
          значения. Соберите все {total} числа — счётчик покажет ваш прогресс.
        </p>
        <div className="mt-2 flex justify-end">
          <Find108ModalButton onClick={() => setRulesOpen(false)}>
            Понятно
          </Find108ModalButton>
        </div>
      </Find108Modal>

      <Find108Modal
        open={victoryOpen}
        onOpenChange={setVictoryOpen}
        title="Поздравляем!"
      >
        <p className="leading-relaxed text-white/75">
          Вы нашли все {total} вхождений <Find108Glyph /> на странице. Покажите
          это уведомление организаторам чтобы получить награду.
        </p>
        <div className="mt-2 flex justify-end">
          <Find108ModalButton onClick={() => setVictoryOpen(false)}>
            Отлично
          </Find108ModalButton>
        </div>
      </Find108Modal>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "grid shrink-0 border-b-2 border-white/30 bg-black sm:grid",
            FIND108_SIDE_COLUMN,
          )}
        >
          <Find108SideColumn />

          <div
            className={cn(
              "flex min-w-0 items-center justify-end gap-3 px-6 py-3 sm:justify-between sm:px-6 sm:py-4",
              FIND108_HEADER_TEXT,
            )}
          >
            <span className="hidden min-w-0 sm:inline">one-zero-eight</span>

            <div className="inline-flex shrink-0 items-stretch overflow-hidden rounded-sm bg-white/5">
              <span className="flex items-center px-2.5 py-1 tabular-nums">
                Найдено: {found} / {total}
              </span>
              <span className="w-px bg-white/20" />
              <button
                type="button"
                className="px-2.5 py-1 hover:bg-white/10"
                onClick={() => setRulesOpen(true)}
              >
                Правила
              </button>
            </div>
          </div>

          <Find108SideColumn />
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="relative">
              <Find108SideRails />

              <div className={cn("grid sm:grid", FIND108_SIDE_COLUMN)}>
                <Find108SideColumn />

                <div className="min-w-0 px-6 py-12">
                  <div className="mx-auto max-w-4xl">
                    <p className={FIND108_ASSIGNMENT_LABEL}>Задание</p>

                    <h1 className={FIND108_ASSIGNMENT_TITLE}>
                      Найдите все вхождения числа <Find108Glyph />
                    </h1>

                    <div className={FIND108_BODY_TEXT}>
                      <Find108SectionHeader>Иннополис</Find108SectionHeader>

                      <Find108Illustration side="right">
                        <Find108Rover
                          signRevealed={revealed.has("rover")}
                          onSignReveal={() => handleReveal("rover")}
                        />
                      </Find108Illustration>

                      <p>
                        Город Иннополис является особым местом для
                        айти-специалистов. В молодом городе находится
                        университет международного уровня образования,
                        выпускники которого устраиваются в бигтехи, имеющие
                        офисы прямо в местном технопарке. Скорее всего вы старше
                        Иннополиса: он был основан всего{" "}
                        <Find108Number
                          value={NUMBER_VALUES["innopolis-age"]}
                          revealed={revealed.has("innopolis-age")}
                          onReveal={() => handleReveal("innopolis-age")}
                        />{" "}
                        лет назад как город инноваций.
                      </p>

                      <Find108SectionHeader>Университет</Find108SectionHeader>

                      <Find108Illustration side="left">
                        <Find108University />
                      </Find108Illustration>

                      <p>
                        В местном университете сейчас обучается{" "}
                        <Find108Number
                          value={NUMBER_VALUES.students}
                          revealed={revealed.has("students")}
                          onReveal={() => handleReveal("students")}
                        />{" "}
                        студентов. Это бакалавры, магистры и аспиранты. У нас
                        есть англоязычные и русскоязычные программы обучения.
                        Кстати, недавно у нас открылся ещё и колледж.
                      </p>

                      <p>
                        В университете сейчас существует{" "}
                        <Find108Number
                          value={NUMBER_VALUES.clubs}
                          revealed={revealed.has("clubs")}
                          onReveal={() => handleReveal("clubs")}
                        />{" "}
                        клубов. Клубы это сообщества студентов существующих на
                        личной инициативе. Есть спортивные, твореские и другие.
                      </p>

                      <Find108SectionHeader>
                        one-zero-eight
                      </Find108SectionHeader>

                      <p>
                        Сейчас вы на станции клуба one-zero-eight. Это
                        сообщество людей влюблённых в технологии. Мы развиваем
                        свои скиллы, создаём проекты для университета и
                        участвуем в хакатонах.
                      </p>

                      <Find108Illustration side="right">
                        <Find108Bus
                          signRevealed={revealed.has("bus")}
                          onSignReveal={() => handleReveal("bus")}
                        />
                      </Find108Illustration>

                      <p>
                        Название нашего клуба использует счастливое число города
                        Иннополис. Это число с нами разделяют название бара,
                        номер автобуса до Казани и лекционная аудитория в
                        университете.
                      </p>

                      <p>
                        Главным проектом клуба one-zero-eight является
                        InNoHassle. На этом вебсайте{" "}
                        <Find108Number
                          value={NUMBER_VALUES.services}
                          revealed={revealed.has("services")}
                          onReveal={() => handleReveal("services")}
                        />{" "}
                        сервисов.
                      </p>

                      <p>
                        Наше сообщество поддерживает опенсорс и развивает свои
                        проекты открытыми для новых участников. Любой желающий
                        поддержать нашу инициативу или обрести опыт практических
                        проектов может{" "}
                        <a
                          href="https://github.com/one-zero-eight"
                          className={FIND108_LINK_CLASS}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          сделать контрибьют
                        </a>{" "}
                        в наш гитхаб или{" "}
                        <a
                          href="https://t.me/one_zero_eight_bot"
                          className={FIND108_LINK_CLASS}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          вступив
                        </a>{" "}
                        в сообщество.
                      </p>
                    </div>
                  </div>
                </div>

                <Find108SideColumn />
              </div>
            </div>

            <footer
              className={cn(
                "grid border-t-2 border-white/20 sm:grid",
                FIND108_SIDE_COLUMN,
              )}
            >
              <Find108SideColumn />

              <div
                className={cn(
                  "flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6 py-4 text-center",
                  FIND108_HEADER_TEXT,
                )}
              >
                <span
                  className={cn("hidden w-8 sm:inline", FIND108_DOTTED_H)}
                />
                <a
                  href="https://t.me/one_zero_eight"
                  className={FIND108_LINK_CLASS}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Telegram
                </a>
                <span className="text-white/25">|</span>
                <a
                  href="https://github.com/one-zero-eight"
                  className={FIND108_LINK_CLASS}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                <span
                  className={cn("hidden w-8 sm:inline", FIND108_DOTTED_H)}
                />
              </div>

              <Find108SideColumn />
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
