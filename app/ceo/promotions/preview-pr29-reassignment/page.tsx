import AssignmentPage from "../[id]/assignment/page";

export default function PreviewPr29ReassignmentPage() {
  return AssignmentPage({
    params: Promise.resolve({ id: "preview-ducato" }),
    searchParams: Promise.resolve({}),
  });
}
