"use client";

import { useEffect, useState } from "react";

const messages = [
  "Allaccio le cinture e preparo i dati dell’offerta…",
  "Metto in ordine canone, durata, km e servizi…",
  "Sto preparando la bozza Shopify, ancora invisibile al pubblico…",
  "Ultimo controllo ECCOMI… quasi pronta.",
];

export default function ShopifyPreparationWaiting() {
  const [active, setActive] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setMessageIndex((current) => Math.min(current + 1, messages.length - 1));
    }, 2600);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLButtonElement>('button[formaction*="/prepare-form"]');
      if (!button || button.dataset.ecWaitingTriggered === "true") return;

      event.preventDefault();
      button.dataset.ecWaitingTriggered = "true";
      setMessageIndex(0);
      setActive(true);

      window.setTimeout(() => {
        const form = button.form;
        if (!form) {
          button.dataset.ecWaitingTriggered = "false";
          setActive(false);
          return;
        }
        form.requestSubmit(button);
      }, 120);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!active) return null;

  return (
    <div className="ec-shopify-wait" role="status" aria-live="polite" aria-busy="true">
      <div className="ec-shopify-wait__card">
        <div className="ec-shopify-wait__eyebrow">ECCOMI NOLEGGIO</div>
        <h2>Sto preparando la bozza</h2>
        <p className="ec-shopify-wait__message">{messages[messageIndex]}</p>

        <div className="ec-shopify-wait__road" aria-hidden="true">
          <span className="ec-shopify-wait__car">🚙</span>
          <span className="ec-shopify-wait__roadline" />
        </div>

        <div className="ec-shopify-wait__note">
          La preparazione può richiedere qualche secondo. Non chiudere questa pagina.
        </div>
      </div>

      <style>{`
        .ec-shopify-wait{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:rgba(8,30,53,.74);backdrop-filter:blur(8px);font-family:Arial,Helvetica,sans-serif}
        .ec-shopify-wait__card{width:min(560px,100%);border-radius:24px;padding:34px 30px 28px;background:#fff;box-shadow:0 28px 80px rgba(0,0,0,.28);text-align:center;color:#10233b}
        .ec-shopify-wait__eyebrow{font-size:12px;font-weight:900;letter-spacing:.14em;color:#0c69a7;margin-bottom:10px}
        .ec-shopify-wait h2{margin:0;font-size:30px;line-height:1.08}
        .ec-shopify-wait__message{min-height:52px;margin:14px auto 8px;max-width:440px;font-size:17px;line-height:1.5;color:#496176}
        .ec-shopify-wait__road{position:relative;height:112px;margin:8px 4px 12px;overflow:hidden;border-radius:18px;background:linear-gradient(180deg,#edf7ff 0 58%,#dce6ee 58% 100%)}
        .ec-shopify-wait__roadline{position:absolute;left:0;right:0;bottom:24px;height:4px;background:repeating-linear-gradient(90deg,#fff 0 34px,transparent 34px 62px)}
        .ec-shopify-wait__car{position:absolute;left:8%;bottom:32px;z-index:2;font-size:42px;filter:drop-shadow(0 7px 5px rgba(0,0,0,.18));animation:ecShopifyDrive 3.6s ease-in-out infinite alternate}
        .ec-shopify-wait__note{font-size:13px;line-height:1.45;color:#6e8192}
        @keyframes ecShopifyDrive{0%{transform:translateX(0) rotate(-1deg)}55%{transform:translateX(210px) rotate(1deg)}100%{transform:translateX(365px) rotate(0)}}
        @media(max-width:620px){.ec-shopify-wait__card{padding:28px 20px 24px}.ec-shopify-wait h2{font-size:26px}.ec-shopify-wait__message{font-size:16px}.ec-shopify-wait__car{font-size:38px}@keyframes ecShopifyDrive{0%{transform:translateX(0)}100%{transform:translateX(230px)}}}
        @media(prefers-reduced-motion:reduce){.ec-shopify-wait__car{animation:none;left:44%}}
      `}</style>
    </div>
  );
}
