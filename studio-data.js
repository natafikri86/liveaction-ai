
(function () {
  "use strict";

  const STORAGE_KEY = "liveaction_ai_studio_projects_v1";

  function makeId(prefix) {
    return prefix + "_" + Date.now().toString(36) +
      "_" + Math.random().toString(36).slice(2, 9);
  }

  function now() {
    return new Date().toISOString();
  }

  function readProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Gagal membaca proyek Studio:", error);
      return [];
    }
  }

  function writeProjects(projects) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(projects)
      );
      return true;
    } catch (error) {
      console.error("Gagal menyimpan proyek Studio:", error);
      return false;
    }
  }

  function createProject(name, description) {
    const project = {
      id: makeId("project"),
      name: String(name || "Proyek Tanpa Nama").trim(),
      description: String(description || "").trim(),
      type: "series",
      createdAt: now(),
      updatedAt: now(),

      settings: {
        visualStyle: "chinese-donghua-3d",
        cinematicQuality: "high",
        sourceType: "live-action",
        targetType: "3d-animation"
      },

      characters: [],
      locations: [],
      episodes: [],
      storyMemory: [],
      productionHistory: []
    };

    const projects = readProjects();
    projects.unshift(project);

    if (!writeProjects(projects)) {
      throw new Error("Proyek gagal disimpan.");
    }

    return project;
  }

  function getProjects() {
    return readProjects();
  }

  function getProject(projectId) {
    return readProjects().find(
      project => project.id === projectId
    ) || null;
  }

  function updateProject(projectId, changes) {
    const projects = readProjects();
    const index = projects.findIndex(
      project => project.id === projectId
    );

    if (index === -1) return null;

    const current = projects[index];

    projects[index] = {
      ...current,
      ...changes,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: now()
    };

    if (!writeProjects(projects)) {
      throw new Error("Perubahan proyek gagal disimpan.");
    }

    return projects[index];
  }

  function deleteProject(projectId) {
    const projects = readProjects();
    const remaining = projects.filter(
      project => project.id !== projectId
    );

    if (remaining.length === projects.length) {
      return false;
    }

    return writeProjects(remaining);
  }

  function addCharacter(projectId, characterData) {
    const project = getProject(projectId);
    if (!project) return null;

    const character = {
      id: makeId("character"),
      name: String(characterData.name || "Karakter Baru"),
      description: String(characterData.description || ""),
      appearance: String(characterData.appearance || ""),
      bodyProfile: String(characterData.bodyProfile || ""),
      costume: String(characterData.costume || ""),
      referenceNotes: String(characterData.referenceNotes || ""),
      createdAt: now(),
      updatedAt: now()
    };

    project.characters.push(character);

    updateProject(projectId, {
      characters: project.characters
    });

    return character;
  }

  function addLocation(projectId, locationData) {
    const project = getProject(projectId);
    if (!project) return null;

    const location = {
      id: makeId("location"),
      name: String(locationData.name || "Lokasi Baru"),
      description: String(locationData.description || ""),
      visualIdentity: String(locationData.visualIdentity || ""),
      atmosphere: String(locationData.atmosphere || ""),
      referenceNotes: String(locationData.referenceNotes || ""),
      createdAt: now(),
      updatedAt: now()
    };

    project.locations.push(location);

    updateProject(projectId, {
      locations: project.locations
    });

    return location;
  }

  function addEpisode(projectId, episodeData) {
    const project = getProject(projectId);
    if (!project) return null;

    const episode = {
      id: makeId("episode"),
      number: Number(episodeData.number) ||
        project.episodes.length + 1,
      title: String(episodeData.title || "Episode Baru"),
      description: String(episodeData.description || ""),
      status: "planned",
      createdAt: now(),
      updatedAt: now()
    };

    project.episodes.push(episode);

    updateProject(projectId, {
      episodes: project.episodes
    });

    return episode;
  }

  function addMemory(projectId, memoryText) {
    const project = getProject(projectId);
    if (!project) return null;

    const memory = {
      id: makeId("memory"),
      text: String(memoryText || ""),
      createdAt: now()
    };

    project.storyMemory.push(memory);

    updateProject(projectId, {
      storyMemory: project.storyMemory
    });

    return memory;
  }

  function getStorageInfo() {
    return {
      key: STORAGE_KEY,
      projectCount: readProjects().length,
      storageAvailable: typeof localStorage !== "undefined"
    };
  }

  window.LiveActionStudioData = {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    addCharacter,
    addLocation,
    addEpisode,
    addMemory,
    getStorageInfo
  };

  console.log("LiveAction AI Studio Data siap digunakan.");
})();
