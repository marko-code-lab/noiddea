import { Spinner } from "../ui/spinner";

export function DashLoading() {
  return (
    <div className="flex items-center justify-center h-dvh w-full absolute inset-0">
      <Spinner className="size-6" />
    </div>
  );
}