
(function () {
  "use strict";

  function openWorkspace(projectId) {
    const data = window.LiveActionStudioData;
    const project = data.getProject(projectId);

    if (!project) {
      alert("Proyek tidak ditemukan.");
      return;
    }

    let workspace = document.getElementById("studioWorkspace");

    if (!workspace) {
      workspace = document.createElement("section");
      workspace.id = "studioWorkspace";
      workspace.style.cssText = [
        "margin:20px 0",
        "padding:18px",
        "border:1px solid #41495d",
        "border-radius:18px",
        "background:#171c29",
        "color:#f5f6fa"
      ].join(";");

      const page = document.getElementById("projectsPage");
      page.appendChild(workspace);
    }

    workspace.style.display = "block";
    workspace.replaceChildren();

    function element(tag, text, style) {
      const node = document.createElement(tag);
      if (text) node.textContent = text;
      if (style) node.style.cssText = style;
      return node;
    }

    function field(placeholder, multiline) {
      const node = document.createElement(
        multiline ? "textarea" : "input"
      );

      node.placeholder = placeholder;
      node.required = !multiline;
      node.style.cssText = [
        "width:100%",
        "box-sizing:border-box",
        "padding:12px",
        "margin:5px 0",
        "border:1px solid #41495d",
        "border-radius:10px",
        "background:#222a3a",
        "color:white",
        "font:inherit"
      ].join(";");

      if (multiline) node.rows = 3;
      return node;
    }

    function button(text, color) {
      const node = element("button", text);
      node.type = "submit";
      node.style.cssText = [
        "padding:12px",
        "margin-top:8px",
        "border:0",
        "border-radius:10px",
        "background:" + (color || "#6d75f5"),
        "color:white",
        "font-weight:700",
        "cursor:pointer"
      ].join(";");
      return node;
    }

    function section(title) {
      const box = element("div", null,
        "margin-top:22px;padding-top:15px;border-top:1px solid #343b4d"
      );
      box.appendChild(element("h3", title));
      return box;
    }

    function showItems(container, items, getText) {
      container.replaceChildren();

      if (!items.length) {
        container.appendChild(element("p", "Belum ada data."));
        return;
      }

      items.forEach(function (item) {
        const card = element("div", null,
          "padding:12px;margin:8px 0;border-radius:10px;background:#222a3a"
        );
        card.appendChild(element("strong", getText(item)));
        container.appendChild(card);
      });
    }

    const header = element("div");
    header.appendChild(element("h2", "🎬 " + project.name));
    header.appendChild(element("p", "Ruang kerja proyek film dan serial"));

    const close = element("button", "Tutup Ruang Kerja");
    close.type = "button";
    close.style.cssText =
      "padding:10px;border:1px solid #6d75f5;border-radius:9px;background:transparent;color:#c4c8ff";

    close.addEventListener("click", function () {
      workspace.style.display = "none";
    });

    header.appendChild(close);
    workspace.appendChild(header);

    // KARAKTER
    const characterSection = section("👤 Karakter");
    const characterList = element("div");
    const characterForm = element("form");
    const characterName = field("Nama karakter");
    const characterAppearance = field("Deskripsi wajah dan penampilan", true);
    const characterBody = field("Bentuk tubuh dan postur", true);
    const characterCostume = field("Pakaian atau kostum", true);
    const characterNotes = field("Catatan referensi", true);

    characterForm.append(
      characterName,
      characterAppearance,
      characterBody,
      characterCostume,
      characterNotes,
      button("+ Simpan Karakter")
    );

    characterForm.addEventListener("submit", function (event) {
      event.preventDefault();

      data.addCharacter(projectId, {
        name: characterName.value,
        appearance: characterAppearance.value,
        bodyProfile: characterBody.value,
        costume: characterCostume.value,
        referenceNotes: characterNotes.value
      });

      openWorkspace(projectId);
    });

    characterSection.append(characterForm, characterList);
    workspace.appendChild(characterSection);

    // LOKASI
    const locationSection = section("📍 Lokasi");
    const locationList = element("div");
    const locationForm = element("form");
    const locationName = field("Nama lokasi");
    const locationVisual = field("Identitas visual tempat", true);
    const locationAtmosphere = field("Suasana dan atmosfer", true);
    const locationNotes = field("Catatan referensi lokasi", true);

    locationForm.append(
      locationName,
      locationVisual,
      locationAtmosphere,
      locationNotes,
      button("+ Simpan Lokasi")
    );

    locationForm.addEventListener("submit", function (event) {
      event.preventDefault();

      data.addLocation(projectId, {
        name: locationName.value,
        visualIdentity: locationVisual.value,
        atmosphere: locationAtmosphere.value,
        referenceNotes: locationNotes.value
      });

      openWorkspace(projectId);
    });

    locationSection.append(locationForm, locationList);
    workspace.appendChild(locationSection);

    // EPISODE
    const episodeSection = section("🎞️ Episode");
    const episodeList = element("div");
    const episodeForm = element("form");
    const episodeNumber = field("Nomor episode");
    episodeNumber.type = "number";
    episodeNumber.min = "1";

    const episodeTitle = field("Judul episode");
    const episodeDescription = field("Ringkasan cerita episode", true);

    episodeForm.append(
      episodeNumber,
      episodeTitle,
      episodeDescription,
      button("+ Simpan Episode")
    );

    episodeForm.addEventListener("submit", function (event) {
      event.preventDefault();

      data.addEpisode(projectId, {
        number: episodeNumber.value,
        title: episodeTitle.value,
        description: episodeDescription.value
      });

      openWorkspace(projectId);
    });

    episodeSection.append(episodeForm, episodeList);
    workspace.appendChild(episodeSection);

    // MEMORI CERITA
    const memorySection = section("🧠 Memori Cerita");
    const memoryList = element("div");
    const memoryForm = element("form");
    const memoryText = field(
      "Catatan penting tentang alur, karakter, atau kesinambungan cerita",
      true
    );

    memoryText.required = true;
    memoryForm.append(memoryText, button("+ Simpan Memori"));

    memoryForm.addEventListener("submit", function (event) {
      event.preventDefault();

      data.addMemory(projectId, memoryText.value);
      openWorkspace(projectId);
    });

    memorySection.append(memoryForm, memoryList);
    workspace.appendChild(memorySection);

    // TAMPILKAN DATA TERSIMPAN
    const latest = data.getProject(projectId);

    showItems(
      characterList,
      latest.characters,
      item => item.name + " — " + (item.appearance || "Belum ada deskripsi")
    );

    showItems(
      locationList,
      latest.locations,
      item => item.name + " — " + (item.atmosphere || "Belum ada suasana")
    );

    showItems(
      episodeList,
      latest.episodes,
      item => "Episode " + item.number + ": " + item.title
    );

    showItems(
      memoryList,
      latest.storyMemory,
      item => item.text
    );

    workspace.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  window.LiveActionStudioWorkspace = {
    open: openWorkspace
  };

  console.log("LiveAction AI Workspace siap.");
})();
