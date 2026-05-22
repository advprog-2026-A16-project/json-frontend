type BannerTone = "error" | "success" | "info" | "warning";

const bannerStyles: Record<BannerTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export function Banner({
  tone,
  children,
  className = "",
}: {
  tone: BannerTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded border px-3 py-2 text-sm ${bannerStyles[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function StateCard({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 ${className}`}>
      {message}
    </div>
  );
}
