export async function GET() {
  return Response.json({
    ok: true,
    service: "lyf-opt-glow",
    timestamp: new Date().toISOString(),
  });
}
