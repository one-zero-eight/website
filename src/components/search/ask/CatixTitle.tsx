// The assistant's name in the page title: "AI" hidden in cAtIx is in gold, as the sparkles before it
export function CatixTitle() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="icon-[material-symbols--auto-awesome-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
      <span>
        c<span className="text-[#F0B132] dark:text-[#F0B132]/90">A</span>t
        <span className="text-[#F0B132] dark:text-[#F0B132]/90">I</span>x
      </span>
    </span>
  );
}
