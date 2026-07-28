import DashboardClient from "./dashboard-client";
import PromotionManagementControls from "./promotion-management-controls";

export default function Home() {
  return (
    <>
      <DashboardClient />
      <PromotionManagementControls />
    </>
  );
}
