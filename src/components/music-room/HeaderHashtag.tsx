export function HeaderHashtag({ link }: { link: string }) {
  return (
    <a
      href={link}
      className="text-3xl text-gray-500 no-underline hover:underline"
    >
      #
    </a>
  );
}
