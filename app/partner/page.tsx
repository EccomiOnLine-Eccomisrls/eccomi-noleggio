import PartnerPortalClient from "./partner-portal-client";
import styles from "./partner-portal-polish.module.css";

export default function PartnerPage() {
  return (
    <div className={styles.portal}>
      <PartnerPortalClient />
    </div>
  );
}
