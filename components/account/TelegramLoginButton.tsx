import { useEffect, useRef } from "react";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url: string;
  auth_date: number;
  hash: string;
};

export type TelegramLoginButtonProps = {
  botName: string;
  usePic?: boolean;
  className?: string;
  cornerRadius?: number;
  requestAccess?: boolean;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: "large" | "medium" | "small";
};

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnAuth: (user: TelegramUser) => void;
    };
  }
}

export default function TelegramLoginButton({
  usePic = false,
  botName,
  className,
  buttonSize = "large",
  onAuth,
  cornerRadius,
  requestAccess = true,
}: TelegramLoginButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current === null) return;

    window.TelegramLoginWidget = {
      dataOnAuth: (user: TelegramUser) => onAuth(user),
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", buttonSize);

    if (cornerRadius !== undefined) {
      script.setAttribute("data-radius", cornerRadius.toString());
    }

    if (requestAccess) {
      script.setAttribute("data-request-access", "write");
    }

    script.setAttribute("data-userpic", usePic.toString());
    script.setAttribute("data-onauth", "TelegramLoginWidget.dataOnAuth(user)");
    script.async = true;

    ref.current.appendChild(script);
  }, [botName, buttonSize, cornerRadius, onAuth, requestAccess, usePic, ref]);

  return <div ref={ref} className={className} />;
}
