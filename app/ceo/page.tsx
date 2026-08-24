import DashboardClient from "../dashboard-client";
import PracticeManagementControls from "../practice-management-controls";
import "../practice-management.css";
import PromotionManagementControls from "../promotion-management-controls";
import PromotionEditControls from "../promotion-edit-controls";
import "../promotion-edit.css";

export default function CeoDashboardPage() {
  return (
    <>
      <DashboardClient />
      <PromotionManagementControls />
      <PromotionEditControls />
      <PracticeManagementControls />
    </>
  );
}
