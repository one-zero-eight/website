import Link from "next/link";

export default function Page() {
  return (
    <div className="flex h-[100dvh] flex-row justify-center p-4 sm:p-16">
      <div className="flex flex-col justify-center text-center">
        <h1 className="mb-4 text-4xl font-bold">You are offline</h1>
        <p className="mb-4">However, some pages may work.</p>
        <Link href="/schedule" className="selected">
          Go to main
        </Link>
      </div>
    </div>
  );
}
