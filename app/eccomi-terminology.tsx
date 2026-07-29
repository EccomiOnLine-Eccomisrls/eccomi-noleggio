"use client";

import { useEffect } from "react";

const replacements: Array<[string, string]> = [
  ["Bozza Shopify", "Bozza Eccomi OnLine"],
  ["prodotto Shopify in bozza", "offerta Eccomi OnLine in bozza"],
  ["bozza Shopify", "bozza Eccomi OnLine"],
  ["registrazione HUB", "registrazione ECCOMI HUB"],
  ["AI, foto e bozza Shopify completate", "AI, foto e bozza Eccomi OnLine completate"],
];

function replaceText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    let value = node.nodeValue || "";
    for (const [from, to] of replacements) value = value.replaceAll(from, to);
    if (value !== node.nodeValue) node.nodeValue = value;
  }
}

export default function EccomiTerminology() {
  useEffect(() => {
    replaceText(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const added of mutation.addedNodes) {
          if (added.nodeType === Node.TEXT_NODE) {
            const text = added as Text;
            let value = text.nodeValue || "";
            for (const [from, to] of replacements) value = value.replaceAll(from, to);
            if (value !== text.nodeValue) text.nodeValue = value;
          } else if (added.nodeType === Node.ELEMENT_NODE) {
            replaceText(added as Element);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
