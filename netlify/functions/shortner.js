export default async function shortener(request) {
  const url = new URL(request.url);
  // Expect path like: /i/<token>
  const match = url.pathname.match(/^\/i\/([^/]+)$/);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  const token = match[1];
  const dest = `https://join.empireaffiliatemarketinghub.com/login?i=${encodeURIComponent(token)}`;
  return Response.redirect(dest, 302);
}