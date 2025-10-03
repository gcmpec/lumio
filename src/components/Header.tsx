import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/activities", label: "Atividades" },
];

export function Header({ currentPath }: { currentPath: string }) {
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mx-6 h-16">
      <a href="/" className="text-sm font-bold leading-none text-foreground">
        Lumio
      </a>
      {links.map((link) => (
        <a
          className={cn(
            "text-sm font-medium leading-none",
            currentPath === link.href
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          href={link.href}
          aria-current={currentPath === link.href ? "page" : undefined}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
