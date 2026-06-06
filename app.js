const sceneGrid = document.querySelector("#sceneGrid");
const categoryTabs = document.querySelector("#categoryTabs");
const searchInput = document.querySelector("#searchInput");
const resultSummary = document.querySelector("#resultSummary");
const clearSearch = document.querySelector("#clearSearch");
const emptyState = document.querySelector("#emptyState");
const drawer = document.querySelector("#sceneDrawer");
const randomModal = document.querySelector("#randomModal");

let activeCategory = "全部";
let activeScene = null;
let currentRandom = null;
let favoritesOnly = false;
const favorites = new Set(JSON.parse(localStorage.getItem("topic-favorites") || "[]"));

const colorMap = {
  coral: "var(--coral)",
  amber: "var(--amber)",
  sage: "var(--sage)",
  blue: "var(--blue)",
  violet: "var(--violet)"
};

function questionKey(sceneId, questionIndex) {
  return `${sceneId}:${questionIndex}`;
}

function persistFavorites() {
  localStorage.setItem("topic-favorites", JSON.stringify([...favorites]));
  document.querySelector("#favoriteCount").textContent = favorites.size;
}

function filteredScenes() {
  const query = searchInput.value.trim().toLowerCase();
  return SCENES.map(scene => {
    const matchingQuestions = scene.questions
      .map((question, index) => ({ question, index }))
      .filter(item => {
        const matchesQuery = !query ||
          scene.title.toLowerCase().includes(query) ||
          scene.description.toLowerCase().includes(query) ||
          item.question.toLowerCase().includes(query);
        const matchesFavorite = !favoritesOnly || favorites.has(questionKey(scene.id, item.index));
        return matchesQuery && matchesFavorite;
      });
    return { ...scene, matchingQuestions };
  }).filter(scene =>
    (activeCategory === "全部" || scene.category === activeCategory) &&
    scene.matchingQuestions.length > 0
  );
}

function renderTabs() {
  categoryTabs.innerHTML = CATEGORIES.map(category => `
    <button class="category-tab ${category === activeCategory ? "active" : ""}"
      data-category="${category}" role="tab" aria-selected="${category === activeCategory}">
      ${category}
    </button>
  `).join("");
}

function renderScenes() {
  const scenes = filteredScenes();
  const query = searchInput.value.trim();
  sceneGrid.innerHTML = scenes.map(scene => {
    const originalIndex = SCENES.findIndex(item => item.id === scene.id) + 1;
    return `
      <article class="scene-card" data-scene-id="${scene.id}" tabindex="0"
        style="--scene-color: ${colorMap[scene.color]}">
        <div class="scene-card-top">
          <span class="scene-index">NO. ${String(originalIndex).padStart(2, "0")}</span>
          <span class="scene-tone">${scene.tone}</span>
        </div>
        <h3>${scene.title}</h3>
        <p>${scene.description}</p>
        <div class="scene-card-bottom">
          <span>${scene.matchingQuestions.length} 个${favoritesOnly ? "收藏" : query ? "相关" : ""}问题</span>
          <span class="scene-arrow">→</span>
        </div>
      </article>
    `;
  }).join("");

  resultSummary.textContent = favoritesOnly
    ? `已收藏 ${favorites.size} 个问题，分布在 ${scenes.length} 个场景`
    : query
      ? `找到 ${scenes.reduce((sum, scene) => sum + scene.matchingQuestions.length, 0)} 个相关问题`
      : `共 ${scenes.length} 个场景 · ${scenes.reduce((sum, scene) => sum + scene.matchingQuestions.length, 0)} 个问题`;
  clearSearch.classList.toggle("hidden", !query && !favoritesOnly);
  emptyState.classList.toggle("hidden", scenes.length > 0);
}

function renderQuestionList(scene, questionSubset = null) {
  const questions = questionSubset || scene.questions.map((question, index) => ({ question, index }));
  document.querySelector("#questionList").innerHTML = questions.map(item => {
    const key = questionKey(scene.id, item.index);
    const active = favorites.has(key);
    return `
      <div class="question-item">
        <span class="question-number">${String(item.index + 1).padStart(2, "0")}</span>
        <p>${item.question}</p>
        <button class="favorite-button ${active ? "active" : ""}"
          data-favorite-key="${key}" aria-label="${active ? "取消收藏" : "收藏"}">
          ${active ? "★" : "☆"}
        </button>
      </div>
    `;
  }).join("");
}

function openScene(sceneId) {
  activeScene = SCENES.find(scene => scene.id === sceneId);
  const filtered = filteredScenes().find(scene => scene.id === sceneId);
  const index = SCENES.findIndex(scene => scene.id === sceneId) + 1;
  document.querySelector("#drawerNumber").textContent = String(index).padStart(2, "0");
  document.querySelector("#drawerCategory").textContent = `${activeScene.category} · ${activeScene.tone}`;
  document.querySelector("#drawerTitle").textContent = activeScene.title;
  document.querySelector("#drawerDescription").textContent = activeScene.description;
  renderQuestionList(activeScene, filtered?.matchingQuestions);
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function drawRandom(scene = null) {
  const pool = scene
    ? scene.questions.map((question, index) => ({ scene, question, index }))
    : filteredScenes().flatMap(item =>
      item.matchingQuestions.map(({ question, index }) => ({
        scene: SCENES.find(scene => scene.id === item.id),
        question,
        index
      }))
    );
  if (!pool.length) return;
  currentRandom = pool[Math.floor(Math.random() * pool.length)];
  document.querySelector("#randomScene").textContent =
    `${currentRandom.scene.category} · ${currentRandom.scene.title}`;
  document.querySelector("#randomQuestion").textContent = currentRandom.question;
  updateRandomFavoriteButton();
  randomModal.classList.add("open");
  randomModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function updateRandomFavoriteButton() {
  if (!currentRandom) return;
  const active = favorites.has(questionKey(currentRandom.scene.id, currentRandom.index));
  document.querySelector("#favoriteRandom").textContent = active ? "已收藏" : "收藏这题";
}

function closeModal() {
  randomModal.classList.remove("open");
  randomModal.setAttribute("aria-hidden", "true");
  if (!drawer.classList.contains("open")) document.body.style.overflow = "";
}

categoryTabs.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderTabs();
  renderScenes();
});

sceneGrid.addEventListener("click", event => {
  const card = event.target.closest("[data-scene-id]");
  if (card) openScene(card.dataset.sceneId);
});
sceneGrid.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-scene-id]");
  if (card) openScene(card.dataset.sceneId);
});

document.querySelector("#questionList").addEventListener("click", event => {
  const button = event.target.closest("[data-favorite-key]");
  if (!button) return;
  const key = button.dataset.favoriteKey;
  favorites.has(key) ? favorites.delete(key) : favorites.add(key);
  persistFavorites();
  renderQuestionList(activeScene);
  if (favoritesOnly) renderScenes();
});

searchInput.addEventListener("input", renderScenes);
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  favoritesOnly = false;
  activeCategory = "全部";
  renderTabs();
  renderScenes();
});
document.querySelector("#favoritesButton").addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  activeCategory = "全部";
  renderTabs();
  renderScenes();
  document.querySelector("#explorer").scrollIntoView({ behavior: "smooth" });
});
document.querySelector("#randomButton").addEventListener("click", () => drawRandom());
document.querySelector("#sceneRandomButton").addEventListener("click", () => drawRandom(activeScene));
document.querySelector("#anotherRandom").addEventListener("click", () => drawRandom());
document.querySelector("#favoriteRandom").addEventListener("click", () => {
  if (!currentRandom) return;
  const key = questionKey(currentRandom.scene.id, currentRandom.index);
  favorites.has(key) ? favorites.delete(key) : favorites.add(key);
  persistFavorites();
  updateRandomFavoriteButton();
});
document.querySelectorAll("[data-close-drawer]").forEach(button =>
  button.addEventListener("click", closeDrawer)
);
document.querySelectorAll("[data-close-modal]").forEach(button =>
  button.addEventListener("click", closeModal)
);
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") {
    closeModal();
    closeDrawer();
  }
});

renderTabs();
renderScenes();
persistFavorites();
