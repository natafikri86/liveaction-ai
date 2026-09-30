
(function () {
  "use strict";

  function startStudioProjects() {
    const data = window.LiveActionStudioData;
    const page = document.getElementById("projectsPage");

    if (!data || !page) {
  const warning = document.createElement("div");
  warning.style.cssText =
    "padding:15px;margin:15px;background:#7f1d1d;color:white;border-radius:10px;";

  warning.textContent = !data
    ? "Studio Proyek: file data belum berhasil dimuat."
    : "Studio Proyek: halaman Proyek tidak ditemukan.";

  document.body.appendChild(warning);

  console.error("Studio Projects: halaman atau data belum tersedia.");
  return;
}

    if (document.getElementById("studioProjectsPanel")) return;

    const panel = document.createElement("section");
    panel.id = "studioProjectsPanel";
    panel.style.cssText = [
      "margin:20px 0",
      "padding:18px",
      "border:1px solid #343b4d",
      "border-radius:18px",
      "background:#171c29",
      "color:#f5f6fa"
    ].join(";");

    const heading = document.createElement("div");
    heading.innerHTML = `
      <div style="font-size:21px;font-weight:800;margin-bottom:6px">
        🎬 Studio Proyek Induk
      </div>
      <div style="font-size:13px;color:#aab2c5;line-height:1.6">
        Kelola film dan serial dalam satu ruang kerja.
        Simpan karakter, lokasi, dan episode secara terstruktur.
      </div>
    `;

    const form = document.createElement("form");
    form.style.cssText = "display:grid;gap:10px;margin-top:18px";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Nama proyek atau serial";
    nameInput.required = true;
    nameInput.maxLength = 100;
    nameInput.style.cssText = inputStyle();

    const descriptionInput = document.createElement("textarea");
    descriptionInput.placeholder = "Deskripsi singkat cerita (opsional)";
    descriptionInput.rows = 3;
    descriptionInput.maxLength = 1000;
    descriptionInput.style.cssText = inputStyle();

    const createButton = document.createElement("button");
    createButton.type = "submit";
    createButton.textContent = "+ Buat Proyek Induk";
    createButton.style.cssText = [
      "padding:13px",
      "border:0",
      "border-radius:12px",
      "background:#6d75f5",
      "color:white",
      "font-weight:700",
      "font-size:14px",
      "cursor:pointer"
    ].join(";");

    const status = document.createElement("div");
    status.setAttribute("role", "status");
    status.style.cssText = "font-size:13px;color:#aab2c5";

    form.append(nameInput, descriptionInput, createButton);
    panel.append(heading, form, status);

    const listHeading = document.createElement("h3");
    listHeading.textContent = "Proyek Saya";
    listHeading.style.cssText = "margin:24px 0 12px;font-size:17px";

    const list = document.createElement("div");
    list.id = "studioProjectsList";
    list.style.cssText = "display:grid;gap:12px";

    panel.append(listHeading, list);
    page.appendChild(panel);

    function inputStyle() {
      return [
        "width:100%",
        "box-sizing:border-box",
        "padding:13px",
        "border:1px solid #41495d",
        "border-radius:11px",
        "background:#222a3a",
        "color:#ffffff",
        "font:inherit"
      ].join(";");
    }

    function makeCard(project) {
      const card = document.createElement("article");
      card.style.cssText = [
        "padding:15px",
        "border:1px solid #343b4d",
        "border-radius:14px",
        "background:#202638"
      ].join(";");

      const title = document.createElement("div");
      title.textContent = project.name;
      title.style.cssText = "font-weight:750;font-size:16px";

      const description = document.createElement("p");
      description.textContent = project.description || "Belum ada deskripsi.";
      description.style.cssText = "font-size:13px;color:#b5bed0;line-height:1.5";

      const stats = document.createElement("div");
      stats.style.cssText = "font-size:12px;color:#aab2c5;line-height:1.8";
      stats.textContent =
        "👤 " + project.characters.length + " karakter  ·  " +
        "📍 " + project.locations.length + " lokasi  ·  " +
        "🎞️ " + project.episodes.length + " episode";

      const date = document.createElement("div");
      date.textContent = "Dibuat: " +
        new Date(project.createdAt).toLocaleDateString("id-ID");
      date.style.cssText = "font-size:11px;color:#8993a8;margin-top:8px";

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.textContent = "Buka Proyek";
      openButton.style.cssText = [
        "margin-top:12px",
        "padding:10px 14px",
        "border:1px solid #6d75f5",
        "border-radius:10px",
        "background:transparent",
        "color:#c4c8ff",
        "font-weight:700"
      ].join(";");

      openButton.addEventListener("click", function () {
  status.textContent =
    "Proyek dipilih: " + project.name +
    ". Ruang kerja sedang diperbaiki.";

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
      card.append(title, description, stats, date, openButton);
      return card;
    }

    function renderProjects() {
      list.replaceChildren();

      const projects = data.getProjects();

      if (!projects.length) {
        const empty = document.createElement("p");
        empty.textContent =
          "Belum ada proyek induk. Buat proyek pertama kamu di atas.";
        empty.style.cssText = "font-size:13px;color:#aab2c5";
        list.appendChild(empty);
        return;
      }

      projects.forEach(function (project) {
        list.appendChild(makeCard(project));
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const name = nameInput.value.trim();
      if (!name) {
        status.textContent = "Nama proyek wajib diisi.";
        return;
      }

      try {
        data.createProject(name, descriptionInput.value);
        nameInput.value = "";
        descriptionInput.value = "";
        status.textContent = "Proyek berhasil dibuat dan disimpan.";
        renderProjects();
      } catch (error) {
        status.textContent =
          "Proyek gagal disimpan. Periksa ruang penyimpanan browser.";
        console.error(error);
      }
    });

    renderProjects();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startStudioProjects);
  } else {
    startStudioProjects();
  }
})();
