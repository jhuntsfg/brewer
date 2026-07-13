export default function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
