import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-9 w-auto max-w-[140px]",
  md: "h-12 w-auto max-w-[180px]",
  lg: "h-16 w-auto max-w-[260px]",
};

/** Local brand logo — plain img avoids Next/Image aspect-ratio console warnings */
export default function ZambeelLogo({ size = "md", className = "", priority }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/zambeel-logo.png"
      alt="Zambeel"
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn(sizes[size] || sizes.md, "object-contain object-left", className)}
    />
  );
}
