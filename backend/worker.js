
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const MAX_VIDEO_SIZE = 32 * 1024 * 1024;
const VIDEO_TTL_MS = 24 * 60 * 60 * 1000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

async function readApiResponse(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { rawResponse: text };
  }
}

function errorMessage(data) {
  if (typeof data === "string") return data;

  return (
    data?.message ||
    data?.error ||
    data?.detail ||
    data?.title ||
    JSON.stringify(data || {})
  );
}

function runwayError(message, detail, status = 502) {
  return json({
    success: false,
    message: message + " Detail: " + errorMessage(detail),
    detail: detail || null
  }, status);
}

function getAssetId(pathname) {
  const match = pathname.match(
    /^\/assets\/([0-9a-f-]{36})$/i
  );

  return match ? match[1] : null;
}

async function serveAsset(request, env, assetId) {
  if (!env.VIDEO_BUCKET) {
    return new Response("Video storage is not configured.", {
      status: 500
    });
  }

  const object = await env.VIDEO_BUCKET.get(assetId);

  if (!object) {
    return new Response("Video not found or expired.", {
      status: 404
    });
  }

  const headers = new Headers({
    "Content-Type":
      object.httpMetadata?.contentType || "video/mp4",
    "Content-Length": String(object.size),
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff"
  });

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers
    });
  }

  return new Response(object.body, {
    status: 200,
    headers
  });
}

async function cleanupExpiredVideos(env) {
  if (!env.VIDEO_BUCKET) return;

  const cutoff = Date.now() - VIDEO_TTL_MS;
  let cursor;

  do {
    const page = await env.VIDEO_BUCKET.list({
      limit: 1000,
      cursor
    });

    const expired = page.objects
      .filter(object => object.uploaded.getTime() < cutoff)
      .map(object => object.key);

    if (expired.length) {
      await env.VIDEO_BUCKET.delete(expired);
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === "/health") {
      return json({
        status: "ok",
        service: "LiveAction AI Backend",
        engine: env.RUNWAY_API_KEY
          ? "configured"
          : "missing_key",
        storage: env.VIDEO_BUCKET
          ? "configured"
          : "missing_bucket"
      });
    }

    // Serve temporary video to Runway
    if (path.startsWith("/assets/")) {
      if (
        request.method !== "GET" &&
        request.method !== "HEAD"
      ) {
        return new Response("Method not allowed.", {
          status: 405,
          headers: {
            ...corsHeaders,
            "Allow": "GET, HEAD"
          }
        });
      }

      const assetId = getAssetId(path);

      if (!assetId) {
        return new Response("Invalid asset ID.", {
          status: 400
        });
      }

      return serveAsset(request, env, assetId);
    }

    // Jobs endpoint
    if (path === "/api/jobs" && request.method === "GET") {
      return json({
        endpoint: "LiveAction AI Jobs",
        method: "POST",
        status: "ready"
      });
    }

    if (path === "/api/jobs" && request.method === "POST") {
      if (!env.RUNWAY_API_KEY) {
        return json({
          success: false,
          message: "RUNWAY_API_KEY belum dikonfigurasi."
        }, 500);
      }

      if (!env.VIDEO_BUCKET) {
        return json({
          success: false,
          message: "VIDEO_BUCKET belum dikonfigurasi."
        }, 500);
      }

      let assetId;

      try {
        const form = await request.formData();
        const video = form.get("video");

        const style =
          form.get("style") || "Cinematic Realism";
        const mode = form.get("mode") || "live";
        const userPrompt = form.get("prompt") || "";

        if (!(video instanceof File)) {
          return json({
            success: false,
            message: "File video tidak ditemukan."
          }, 400);
        }

        if (!video.type.startsWith("video/")) {
          return json({
            success: false,
            message: "File yang dikirim bukan video."
          }, 400);
        }

        if (video.size > MAX_VIDEO_SIZE) {
          return json({
            success: false,
            message:
              "Ukuran video maksimal 32 MB untuk URL input Runway."
          }, 413);
        }

        if (video.size < 512) {
          return json({
            success: false,
            message: "Ukuran video terlalu kecil."
          }, 400);
        }

        const prompt = [
          mode === "3d"
            ? "Transform this video into a polished 3D animated film."
            : "Transform this video into cinematic live-action realism.",
          "Visual style: " + style + ".",
          "Preserve the original scene composition, character identity, movement, and camera motion as much as possible.",
          userPrompt
        ].filter(Boolean).join(" ");

        // Save video in private R2 bucket
        assetId = crypto.randomUUID();

        await env.VIDEO_BUCKET.put(
          assetId,
          video.stream(),
          {
            httpMetadata: {
              contentType: video.type || "video/mp4"
            },
            customMetadata: {
              originalName: video.name || "input.mp4",
              createdAt: new Date().toISOString()
            }
          }
        );

        // Create direct HTTPS URL for Runway
        const videoUrl = new URL(
          "/assets/" + assetId,
          url.origin
        ).toString();

        // Start Runway video-to-video task
        const taskResponse = await fetch(
          "https://api.dev.runwayml.com/v1/video_to_video",
          {
            method: "POST",
            headers: {
              "Authorization":
                "Bearer " + env.RUNWAY_API_KEY,
              "Content-Type": "application/json",
              "X-Runway-Version": "2024-11-06"
            },
            body: JSON.stringify({
              model: "aleph2",
              videoUri: videoUrl,
              promptText: prompt
            })
          }
        );

        const task = await readApiResponse(taskResponse);

        if (!taskResponse.ok) {
          return runwayError(
            "Runway gagal memulai transformasi.",
            task,
            taskResponse.status
          );
        }

        if (!task.id) {
          return runwayError(
            "Runway tidak mengembalikan ID tugas.",
            task,
            502
          );
        }

        return json({
          success: true,
          message:
            "Video diterima. Transformasi AI telah dimulai.",
          taskId: task.id,
          status: task.status || "PENDING"
        }, 202);

      } catch (error) {
        // Remove uploaded source if task creation failed
        if (assetId && env.VIDEO_BUCKET) {
          try {
            await env.VIDEO_BUCKET.delete(assetId);
          } catch {
            // Scheduled cleanup will remove leftovers.
          }
        }

        return json({
          success: false,
          message:
            "Backend gagal memproses video: " +
            (error.message || "Kesalahan tidak diketahui.")
        }, 500);
      }
    }

    // Poll Runway task
    if (
      path.startsWith("/api/tasks/") &&
      request.method === "GET"
    ) {
      if (!env.RUNWAY_API_KEY) {
        return json({
          success: false,
          message: "RUNWAY_API_KEY belum dikonfigurasi."
        }, 500);
      }

      const taskId = path.split("/").pop();

      if (!taskId) {
        return json({
          success: false,
          message: "ID tugas tidak ditemukan."
        }, 400);
      }

      try {
        const response = await fetch(
          "https://api.dev.runwayml.com/v1/tasks/" +
            encodeURIComponent(taskId),
          {
            headers: {
              "Authorization":
                "Bearer " + env.RUNWAY_API_KEY,
              "X-Runway-Version": "2024-11-06"
            }
          }
        );

        const result = await readApiResponse(response);

        if (!response.ok) {
          return runwayError(
            "Gagal memeriksa status tugas Runway.",
            result,
            response.status
          );
        }

        return json(result, response.status);

      } catch (error) {
        return json({
          success: false,
          message:
            "Gagal menghubungi Runway: " +
            (error.message || "Kesalahan tidak diketahui.")
        }, 502);
      }
    }

    return json({
      name: "LiveAction AI Backend",
      status: "online",
      endpoints: [
        "/health",
        "/api/jobs",
        "/api/tasks/:id",
        "/assets/:id"
      ]
    });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanupExpiredVideos(env));
  }
};
