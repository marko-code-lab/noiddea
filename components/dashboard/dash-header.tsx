export function DashHeader({ title, children }: { title: string, children?: React.ReactNode }) {
  return (
    <header className="h-12 flex items-center justify-between px-6">
      <div></div>
      <span className="font-medium text-sm">{title}</span>
      {children}
      <div></div>
    </header>
  );
}