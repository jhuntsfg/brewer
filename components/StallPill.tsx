export default function StallPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-stall-light text-stall text-xs font-medium px-2 py-0.5 border border-stall/30">
      {label}
    </span>
  );
}
