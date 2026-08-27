import PartnerPortalClient from "./partner-portal-client";
import styles from "./partner-portal-polish.module.css";

export default function PartnerPage() {
  return (
    <div className={styles.portal}>
      <PartnerPortalClient />
      <a
        href="/partner/provvigioni"
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 80,
          padding: "12px 16px",
          borderRadius: 999,
          background: "#0879c9",
          color: "#fff",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "0 12px 30px rgba(0,0,0,.18)",
        }}
      >
        Provvigioni offerte →
      </a>
    </div>
  );
}
