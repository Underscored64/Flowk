import Link from 'next/link';

export default function ForbiddenPage() {
  return (
     <div className="flex min-h-screen flex-col items-center justify-center gap-4">
       <h1 className="text-2xl font-semibold">403 — Forbidden</h1>
       <p className="text-sm text-muted-foreground">
        You do not have permission to access this resource.
       </p>
       <Link href="/dashboard" className="text-sm underline hover:text-foreground">
         Back to dashboard
       </Link>
     </div>
   );
}
