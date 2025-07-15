import { AdminDashboard } from '@/components/admin-dashboard';

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage customer queues in real-time.</p>
      </div>
      <AdminDashboard />
    </div>
  );
}
