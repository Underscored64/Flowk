import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
     <div className="flex flex-col gap-6">
       <h1 className="text-2xl font-semibold">Dashboard</h1>
       <Card>
         <CardHeader>
           <CardTitle>Welcome</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-sm text-muted-foreground">
             Use the sidebar to navigate. Pages that read the database will be
             available as the platform is built out.
           </p>
         </CardContent>
       </Card>
     </div>
    );
}
