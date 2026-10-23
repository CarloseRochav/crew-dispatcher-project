import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

type SignedInHeaderProps = {
  title: string;
  name: string;
};

export function SignedInHeader({ title, name }: SignedInHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-2">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {name && <p className="text-sm text-muted-foreground">{name}</p>}
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="h-11 px-4">
          Sign out
        </Button>
      </form>
    </header>
  );
}
