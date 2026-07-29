import DashboardClient from "./dashboard-client";
import PracticeManagementControls from "./practice-management-controls";
import "./practice-management.css";
import PromotionManagementControls from "./promotion-management-controls";

export default function Home() {
  return (
    <>
      <DashboardClient />
      <PromotionManagementControls />
      <PracticeManagementControls />
    </>
  );
}
