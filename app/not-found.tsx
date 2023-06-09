import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-row justify-center p-4 sm:p-16 h-screen">
      <div className="flex flex-col justify-center text-center">
        <h1 className="text-4xl font-bold mb-8">404 / not found</h1>
        <Link href="/" className="selected">
          Go to main
        </Link>
      </div>
    </div>
  );
}
