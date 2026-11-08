import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/server/session';
import { AppSidebar } from '@/components/app-sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    redirect('/login');
   }

  const session = await verifyToken(token);
  if (!session) {
    // Expired/invalid — redirect; stale cookie will just be ignored next request.
    redirect('/login');
   }

  return (
      <div className="flex min-h-screen bg-muted/30">
        <AppSidebar role={session.role} />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-6">
            <span className="text-sm font-medium text-muted-foreground">
              {session.role.toUpperCase()}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-sm">{session.name}</span>
              <form action="/api/auth/logout" method="POST">
                <button
                type="submit"
                className="text-sm text-muted-foreground underline hover:text-foreground"
                >
                 Sign out
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
     );
}
