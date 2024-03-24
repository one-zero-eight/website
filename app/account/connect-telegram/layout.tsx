import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex w-full flex-row justify-center">
      <div className="my-4 flex w-full max-w-md flex-col gap-4 rounded-2xl bg-primary-main px-4 py-6 @container/account">
        <img
          src="/icon.svg"
          alt="InNoHassle logo"
          className="h-24 w-24 self-center"
        />
        {children}
      </div>
    </div>
  );
}
