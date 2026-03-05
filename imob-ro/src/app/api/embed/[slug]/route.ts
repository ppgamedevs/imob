export const runtime = "edge";

function sanitizeSlug(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const host = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "").replace(/"/g, "");
  const slug = sanitizeSlug(resolvedParams.slug);

  if (!slug) {
    return new Response("// invalid slug", {
      status: 400,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const js = `
(function(){
  var slug="${slug}";
  var iframe=document.createElement('iframe');
  iframe.src="${host}/s/"+slug+"?embed=1";
  iframe.style.border="0";
  iframe.style.width="100%";
  iframe.style.height="640px";
  iframe.loading="lazy";
  document.currentScript.parentNode.insertBefore(iframe, document.currentScript);
  
  window.addEventListener("message", function(e){
    if (e.data && e.data.__imobintel_embed && e.data.slug===slug) {
      iframe.style.height = e.data.height+"px";
    }
  });
})();`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
