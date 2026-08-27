import AssignmentPage from "../[id]/assignment/page";

export default async function PreviewPr29ReassignmentPage() {
  return await AssignmentPage({
    params: Promise.resolve({ id: "preview-ducato" }),
    searchParams: Promise.resolve({}),
  });
}
