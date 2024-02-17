import Link from "next/link";

export default function Page() {
  return (
    <div className="@container/content flex h-[100dvh] flex-row justify-center p-4 @2xl/main:p-12">
      <div className="flex flex-col justify-center text-center">
        <h1 className="mb-8 text-4xl font-bold">404 / not found</h1>
        <Link href="/" className="selected">
          Go to main
        </Link>
      </div>
    </div>
  );
}
