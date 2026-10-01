const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

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

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { rawResponse: text };
  }
}

function getErrorMessage(data) {
  if (!data) {
    return "Tidak ada detail kesalahan dari layanan.";
  }

  if (typeof data === "string") {
    return data;
  }

  return (
    data.message ||
    data.error ||
    data.detail ||
    data.title ||
    JSON.stringify(data)
  );
}

function apiError(message, detail, status = 502) {
  const explanation = getErrorMessage(detail);

  return json({
    success: false,
    message: message + " Detail: " + explanation,
    detail: detail || null
  }, status);
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

    // Pemeriksaan kesehatan backend
    if (url.pathname === "/health") {
      return json({
        status: "ok",
        service: "LiveAction AI Backend",
        engine: env.RUNWAY_API_KEY
          ? "configured"
          : "missing_key",
        availableBindings: Object.keys(env)
      });
    }

    // Informasi endpoint pekerjaan
    if (
      url.pathname === "/api/jobs" &&
      request.method === "GET"
    ) {
      return json({
        endpoint: "LiveAction AI Jobs",
        method: "POST",
        status: "ready",
        message: "Backend siap menerima video."
      });
    }

    // Membuat pekerjaan transformasi video
    if (
      url.pathname === "/api/jobs" &&
      request.method === "POST"
    ) {
      if (!env.RUNWAY_API_KEY) {
        return json({
          success: false,
          message: "RUNWAY_API_KEY belum dikonfigurasi."
        }, 500);
      }

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

        if (video.size > 80 * 1024 * 1024) {
          return json({
            success: false,
            message: "Ukuran video maksimal 80 MB."
          }, 413);
        }

        const prompt = [
          mode === "3d"
            ? "Transform this video into a polished 3D animated film."
            : "Transform this video into cinematic live-action realism.",
          "Visual style: " + style + ".",
          "Preserve the original scene composition, character identity, movement, and camera motion as much as possible.",
          userPrompt
        ].filter(Boolean).join(" ");

        // Meminta URL upload sementara dari Runway
        const uploadResponse = await fetch(
          "https://api.dev.runwayml.com/v1/uploads",
          {
            method: "POST",
            headers: {
              "Authorization":
                "Bearer " + env.RUNWAY_API_KEY,
              "Content-Type": "application/json",
              "X-Runway-Version": "2024-11-06"
            },
            body: JSON.stringify({
              filename: video.name || "input.mp4",
              type: "ephemeral"
            })
          }
        );

        const uploadInfo =
          await readApiResponse(uploadResponse);

        if (!uploadResponse.ok) {
          return apiError(
            "Runway gagal menyiapkan upload.",
            uploadInfo,
            uploadResponse.status
          );
        }

        if (
          !uploadInfo.uploadUrl ||
          !uploadInfo.runwayUri
        ) {
          return apiError(
            "Respons upload Runway tidak lengkap.",
            uploadInfo,
            502
          );
        }

        // Mengirim video ke penyimpanan sementara Runway
        const uploadForm = new FormData();

        for (
          const [key, value] of Object.entries(
            uploadInfo.fields || {}
          )
        ) {
          uploadForm.append(key, value);
        }

        uploadForm.append(
          "file",
          video,
          video.name || "input.mp4"
        );

        const fileUpload = await fetch(
          uploadInfo.uploadUrl,
          {
            method: "POST",
            body: uploadForm
          }
        );

        if (!fileUpload.ok) {
          const uploadError =
            await readApiResponse(fileUpload);

          return apiError(
            "Upload video ke Runway gagal.",
            uploadError,
            502
          );
        }

        // Memulai transformasi video
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
              videoUri: uploadInfo.runwayUri,
              promptText: prompt
            })
          }
        );

        const task =
          await readApiResponse(taskResponse);

        if (!taskResponse.ok) {
          return apiError(
            "Runway gagal memulai transformasi.",
            task,
            taskResponse.status
          );
        }

        if (!task.id) {
          return apiError(
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
        return json({
          success: false,
          message:
            "Terjadi kesalahan pada backend: " +
            (error.message || "Kesalahan tidak diketahui."),
          detail: error.message || null
        }, 500);
      }
    }

    // Memeriksa status pekerjaan
    if (
      url.pathname.startsWith("/api/tasks/") &&
      request.method === "GET"
    ) {
      if (!env.RUNWAY_API_KEY) {
        return json({
          success: false,
          message: "RUNWAY_API_KEY belum dikonfigurasi."
        }, 500);
      }

      const taskId =
        url.pathname.split("/").pop();

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

        const result =
          await readApiResponse(response);

        if (!response.ok) {
          return apiError(
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

    // Informasi umum backend
    return json({
      name: "LiveAction AI Backend",
      status: "online",
      endpoints: [
        "/health",
        "/api/jobs",
        "/api/tasks/:id"
      ]
    });
  }
};

