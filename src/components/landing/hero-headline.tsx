/**
 * Hero H1 revealed word by word with CSS (tw-animate), so it is visible and
 * animating before hydration. Screen readers get the sentence via aria-label;
 * reduced motion keeps the fade and drops the lift (globals.css).
 */
export function HeroHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <h1 aria-label={text} className="display-type text-balance text-4xl md:text-5xl lg:text-6xl">
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500 max-lg:animate-none"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          {word}
          {i < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </h1>
  );
}
