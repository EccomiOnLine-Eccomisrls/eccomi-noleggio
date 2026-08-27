import type { ReactNode } from "react";
import Pr21FileUploadFix from "./file-upload-fix";

export default function Pr21PracticesDemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Pr21FileUploadFix />
      {children}
    </>
  );
}
