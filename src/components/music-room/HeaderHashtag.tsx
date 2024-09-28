export function HeaderHashtag({ link }: { link: string }) {
  return (
    <a
      href={link}
      className="absolute ml-2 translate-y-0.5 text-gray-500 no-underline hover:underline"
    >
      #
    </a>
  );
}
