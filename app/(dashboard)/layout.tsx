import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { requireStaff } from '@/lib/auth/require-staff';
import { Toaster } from 'sonner';
import { NewOrderAlertProvider } from '@/components/orders/new-order-alert-provider';
import { NewOrderAlertBanner } from '@/components/orders/new-order-alert-banner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  return (
    <NewOrderAlertProvider>
      <NewOrderAlertBanner />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header fullName={staff.fullName} role={staff.role} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </NewOrderAlertProvider>
  );
}
