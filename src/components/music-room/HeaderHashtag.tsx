export function HeaderHashtag({ link }: { link: string }) {
  return (
    <a
      href={link}
      className="text-base-content/50 text-3xl no-underline hover:underline"
    >
      #
    </a>
  );
}
