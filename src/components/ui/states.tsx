import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

interface StateProps { title: string; description: string; action?: ReactNode; }
export function EmptyState({ title, description, action }: StateProps) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center"><span className="mb-4 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Inbox className="size-5" /></span><h3 className="font-display text-xl font-semibold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
export function ErrorState({ title = "Something went wrong", description = "Please try again in a moment.", onRetry }: StateProps & { onRetry?: () => void }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center"><span className="mb-4 grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive"><AlertCircle className="size-5" /></span><h3 className="font-display text-xl font-semibold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>{onRetry && <Button className="mt-5" variant="outline" onClick={onRetry}>Try again</Button>}</div>;
}
