let configData = null;
let currentLayer = null;
let currentCharacter = "rabbit";

const PRESET_KEY = "avatarPreset";

const state = {
  body: 0,
  layerOffset: {
    mouthBase: { x: 0, y: 0 }
  }
};

async function init() {
  try {
    const res = await fetch("data/avatarConfig.json");
    configData = await res.json();

    updateCurrentCharacter();
    cleanInvalidState();
    buildCategory();

    const firstVisibleLayer = getVisibleLayers()[0];
    if (firstVisibleLayer) {
      currentLayer = firstVisibleLayer.name;
      buildItems(firstVisibleLayer);
    }

    renderAvatar();
  } catch (error) {
    console.error("載入設定檔失敗:", error);
    alert("無法載入角色設定，請確認 data/avatarConfig.json 是否存在。");
  }
}

function getVisibleLayers() {
  return configData.layers.filter((layer) => {
    return !layer.onlyFor || layer.onlyFor.includes(currentCharacter);
  });
}

function updateCurrentCharacter() {
  const bodyLayer = configData?.layers.find((layer) => layer.name === "body");
  if (!bodyLayer) return;

  const bodyIndex = state.body || 0;
  const selectedBody = bodyLayer.items[bodyIndex];

  if (selectedBody && selectedBody.character) {
    currentCharacter = selectedBody.character;
  }
}

function cleanInvalidState() {
  configData.layers.forEach((layer) => {
    if (layer.onlyFor && !layer.onlyFor.includes(currentCharacter)) {
      delete state[layer.name];
    }
  });
}

function buildCategory() {
  const categoryDiv = document.getElementById("category");
  categoryDiv.innerHTML = "";

  const visibleLayers = getVisibleLayers();

  visibleLayers.forEach((layer) => {
    const btn = document.createElement("button");
    btn.innerText = layer.name;

    if (currentLayer === layer.name) {
      btn.classList.add("selected-category");
    }

    btn.onclick = () => {
      currentLayer = layer.name;
      buildCategory();
      buildItems(layer);
    };

    categoryDiv.appendChild(btn);
  });
}

function buildItems(layer) {
  const itemsDiv = document.getElementById("items");
  itemsDiv.innerHTML = "";

  layer.items.forEach((item, index) => {
    const img = document.createElement("img");
    img.src = `assets/${layer.name}/${item.thumb}`;
    img.className = "thumb";

    if (state[layer.name] === index) {
      img.classList.add("selected");
    }

    img.onclick = () => {
      state[layer.name] = index;

      if (layer.name === "body") {
        updateCurrentCharacter();
        cleanInvalidState();

        const visibleLayers = getVisibleLayers();

        if (!visibleLayers.some((visibleLayer) => visibleLayer.name === currentLayer)) {
          currentLayer = visibleLayers[0]?.name || null;
        }

        buildCategory();

        const activeLayer = visibleLayers.find((visibleLayer) => visibleLayer.name === currentLayer);
        if (activeLayer) {
          buildItems(activeLayer);
        } else {
          itemsDiv.innerHTML = "";
        }
      } else {
        buildItems(layer);
      }

      renderAvatar();
    };

    itemsDiv.appendChild(img);
  });
}

function renderAvatar() {
  updateCurrentCharacter();
  cleanInvalidState();

  const canvas = document.getElementById("canvas");
  canvas.innerHTML = "";

  [...configData.layers]
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach((layer) => {
      if (layer.onlyFor && !layer.onlyFor.includes(currentCharacter)) {
        return;
      }

      const index = state[layer.name] || 0;
      const item = layer.items[index];
      if (!item) return;

      const img = document.createElement("img");
      img.src = `assets/${layer.name}/${item.file}`;
      img.alt = `${layer.name}-${index}`;
      img.style.position = "absolute";
      img.style.left = "50%";
      img.style.top = "50%";

      const offset = state.layerOffset?.[layer.name] || { x: 0, y: 0 };
      img.style.transform = `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`;

      canvas.appendChild(img);
    });

  const moveControls = document.querySelector(".move-controls");
  if (moveControls) {
    moveControls.style.display = currentCharacter === "bear" ? "inline-block" : "none";
  }
}

function resetLayerPosition(layerName) {
  if (!state.layerOffset[layerName]) {
    state.layerOffset[layerName] = { x: 0, y: 0 };
  }

  state.layerOffset[layerName].x = 0;
  state.layerOffset[layerName].y = 0;

  renderAvatar();
}

function moveLayer(layerName, dx, dy) {
  if (!state.layerOffset[layerName]) {
    state.layerOffset[layerName] = { x: 0, y: 0 };
  }

  state.layerOffset[layerName].x += dx;
  state.layerOffset[layerName].y += dy;

  renderAvatar();
}

async function randomizeAvatar() {
  const bodyLayer = configData.layers.find((layer) => layer.name === "body");

  if (bodyLayer) {
    state.body = Math.floor(Math.random() * bodyLayer.items.length);
    updateCurrentCharacter();
    cleanInvalidState();
  }

  for (let i = 0; i < 5; i++) {
    configData.layers.forEach((layer) => {
      if (layer.name === "body") return;

      if (layer.onlyFor && !layer.onlyFor.includes(currentCharacter)) {
        delete state[layer.name];
        return;
      }

      const max = layer.items.length;
      state[layer.name] = Math.floor(Math.random() * max);
    });

    renderAvatar();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  resetAllOffsets();

  buildCategory();

  const visibleLayers = getVisibleLayers();
  if (!visibleLayers.some((layer) => layer.name === currentLayer)) {
    currentLayer = visibleLayers[0]?.name || null;
  }

  const activeLayer = visibleLayers.find((layer) => layer.name === currentLayer);
  if (activeLayer) {
    buildItems(activeLayer);
  } else {
    document.getElementById("items").innerHTML = "";
  }

  renderAvatar();
}

function resetAllOffsets() {
  if (!state.layerOffset) {
    state.layerOffset = {};
  }

  Object.keys(state.layerOffset).forEach((layerName) => {
    state.layerOffset[layerName] = { x: 0, y: 0 };
  });

  if (!state.layerOffset.mouthBase) {
    state.layerOffset.mouthBase = { x: 0, y: 0 };
  }
}

function savePreset() {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(state));
    alert("設定已儲存。");
  } catch (error) {
    console.error("儲存設定失敗:", error);
    alert("儲存設定失敗。");
  }
}

function loadPreset() {
  try {
    const saved = localStorage.getItem(PRESET_KEY);

    if (!saved) {
      alert("目前沒有已儲存的設定。");
      return;
    }

    const parsedState = JSON.parse(saved);

    Object.keys(state).forEach((key) => {
      delete state[key];
    });

    Object.assign(state, parsedState);

    if (!state.layerOffset) {
      state.layerOffset = {};
    }

    if (!state.layerOffset.mouthBase) {
      state.layerOffset.mouthBase = { x: 0, y: 0 };
    }

    updateCurrentCharacter();
    cleanInvalidState();
    buildCategory();

    const visibleLayers = getVisibleLayers();
    if (!visibleLayers.some((layer) => layer.name === currentLayer)) {
      currentLayer = visibleLayers[0]?.name || null;
    }

    const activeLayer = visibleLayers.find((layer) => layer.name === currentLayer);
    if (activeLayer) {
      buildItems(activeLayer);
    } else {
      document.getElementById("items").innerHTML = "";
    }

    renderAvatar();
    alert("已讀取儲存設定。");
  } catch (error) {
    console.error("讀取設定失敗:", error);
    alert("讀取設定失敗。");
  }
}

function downloadAvatarPNG() {
  const target = document.getElementById("canvas");

  if (!target) {
    alert("找不到預覽畫布。");
    return;
  }

  html2canvas(target, {
    backgroundColor: null,
    useCORS: true,
    scale: 2
  })
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = `avatar-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    })
    .catch((error) => {
      console.error("下載 PNG 失敗:", error);
      alert("下載 PNG 失敗，請稍後再試，並確認素材圖片可正常載入。");
    });
}

init();
