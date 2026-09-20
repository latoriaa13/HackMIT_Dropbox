import Link from "next/link";

/** Explicit width — % width collapses to 0 when child images are absolutely positioned. */
const wrapClass =
  "relative block h-14 w-[min(280px,calc(100vw-3rem))] sm:h-16 sm:w-[min(320px,calc(100vw-3rem))]";
const imgClass = "absolute inset-0 h-full w-full object-contain object-center";

export function DonoRexLogo({
  className = "",
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`mx-auto inline-flex items-center justify-center ${className}`}
      aria-label="DonoRex home"
    >
      <span className={wrapClass}>
        <img
          src="/donorex-logo.png"
          alt="DonoRex"
          width={987}
          height={314}
          decoding="async"
          className={`donorex-logo-light ${imgClass}`}
        />
        <img
          src="/donorex-logo-dark.png"
          alt=""
          aria-hidden
          width={987}
          height={314}
          decoding="async"
          className={`donorex-logo-dark ${imgClass}`}
        />
      </span>
    </Link>
  );
}
