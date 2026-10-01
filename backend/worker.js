
export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "LiveAction AI Backend",
        engine: "not_connected"
      }, {
        headers: corsHeaders
      });
    }

    if (url.pathname === "/api/jobs" && request.method === "POST") {
      return Response.json({
        success: false,
        message: "Mesin AI video belum terhubung.",
        status: "waiting_for_ai_engine"
      }, {
        status: 501,
        headers: corsHeaders
      });
    }

    return Response.json({
      name: "LiveAction AI Backend",
      status: "online",
      endpoints: [
        "/health",
        "/api/jobs"
      ]
    }, {
      headers: corsHeaders
    });
  }
};
