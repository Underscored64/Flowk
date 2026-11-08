import Link from 'next/link';

const nav = [
  { label: 'Dashboard', href: '/dashboard', roles: ['admin', 'manager', 'agent'] },
  { label: 'Workflows', href: '/workflows', roles: ['admin', 'manager', 'agent'] },
  { label: 'Invoices', href: '/invoices', roles: ['admin', 'manager'] },
  { label: 'Tickets', href: '/tickets', roles: ['admin', 'manager', 'agent'] },
  { label: 'Announcements', href: '/announcements', roles: ['admin'] },
  { label: 'Meetings', href: '/meetings', roles: ['admin', 'manager', 'agent'] },
  { label: 'Admin', href: '/admin', roles: ['admin'] },
  { label: 'Audit Log', href: '/audit', roles: ['admin', 'manager'] },
];

export function AppSidebar({ role }: { role: string }) {
  const items = nav.filter((n) => n.roles.includes(role));

  return (
    <aside className="flex w-52 flex-col border-r bg-background p-4">
      <div className="mb-6 px-2 text-lg font-semibold">Workflow</div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
           key={item.href}
           href={item.href}
           className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
   );
}
