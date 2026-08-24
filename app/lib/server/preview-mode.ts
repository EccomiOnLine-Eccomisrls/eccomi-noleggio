export function isRenderPullRequestPreview(request?: Request) {
  const pullRequestFlag = process.env.IS_PULL_REQUEST?.trim().toLowerCase();
  const serviceName = process.env.RENDER_SERVICE_NAME?.trim().toLowerCase() || "";
  const externalHostname = process.env.RENDER_EXTERNAL_HOSTNAME?.trim().toLowerCase() || "";
  let requestHostname = "";

  if (request) {
    try {
      requestHostname = new URL(request.url).hostname.toLowerCase();
    } catch {
      requestHostname = "";
    }
  }

  return (
    pullRequestFlag === "true" ||
    /^\d+$/.test(pullRequestFlag || "") ||
    serviceName.includes("-pr-") ||
    externalHostname.includes("-pr-") ||
    requestHostname.includes("-pr-")
  );
}
