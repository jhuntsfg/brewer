import { initials } from "@/lib/computed";

export default function Avatar({
  name,
  stalled,
  size = "md",
}: {
  name: string;
  stalled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "w-16 h-16 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClass} rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center`}
      >
        {initials(name)}
      </div>
      {stalled && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-stall border-2 border-white" />
      )}
    </div>
  );
}
