
export default {
  async fetch(request) {
    const url = new URL(request.url);

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

    if (url.pathname === "/health") {
      return Response.json(
        {
          status: "online",
          service: "LiveAction AI Backend",
          message: "Backend aktif. Mesin AI video belum terhubung."
        },
        { headers: corsHeaders }
      );
    }

    return Response.json(
      {
        service: "LiveAction AI",
        status: "ready",
        endpoints: ["/health"]
      },
      { headers: corsHeaders }
    );
  }
};
