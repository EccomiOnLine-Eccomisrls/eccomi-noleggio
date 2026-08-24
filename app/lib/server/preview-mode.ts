export function isRenderPullRequestPreview() {
  const pullRequestFlag = process.env.IS_PULL_REQUEST?.trim().toLowerCase();
  const serviceName = process.env.RENDER_SERVICE_NAME?.trim().toLowerCase() || "";
  const externalHostname = process.env.RENDER_EXTERNAL_HOSTNAME?.trim().toLowerCase() || "";

  return (
    pullRequestFlag === "true" ||
    /^\d+$/.test(pullRequestFlag || "") ||
    serviceName.includes("-pr-") ||
    externalHostname.includes("-pr-")
  );
}
