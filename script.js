{"id";"49201","title";"script atualizado pokedex","variant";"standard"}
const API_BASE = 'https://pokeapi.co/api/v2';
const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');
const loadMoreBtn = document.getElementById('loadMore');


const typeColors = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass:'#7AC74C', ice:'#96D9D6', fighting:'#C22E28', poison:'#A33EA1',
  ground:'#E2BF65', flying:'#A98FF3', psychic:'#F95587', bug:'#A6B91A',
  rock:'#B6A136', ghost:'#735797', dragon:'#6F35FC', dark:'#705746',
  steel:'#B7B7CE', fairy:'#D685AD'
};


let allList = [];
let nextIndexToLoad = 1;
const PAGE_SIZE = 48;
const cache = new Map();


const IS_MOBILE = window.innerWidth < 480;
const FLAVOR_LIMIT = IS_MOBILE ? 70 : 120;
const NAME_LIMIT = IS_MOBILE ? 12 : 999;

async function init() {
  try {
    loader.textContent = 'Carregando lista completa...';

    const r = await fetch(`${API_BASE}/pokemon?limit=100000&offset=0`);
    const data = await r.json();

    allList = data.results
      .map(item => {
        const parts = item.url.split('/').filter(Boolean);
        const id = Number(parts[parts.length - 1]);
        return { ...item, id };
      })
      .sort((a, b) => a.id - b.id);

    loader.textContent = 'Carregando primeiros pokémons...';
    await loadRange(nextIndexToLoad, PAGE_SIZE);
    loader.style.display = 'none';

  } catch (e) {
    loader.textContent = 'Erro ao carregar. Verifique sua conexão.';
    console.error(e);
  }
}

async function loadRange(startId, count) {
  const toLoad = allList
    .filter(p => p.id >= startId)
    .slice(0, count);


  for (const p of toLoad) {
    await loadAndRender(p.id);
  }

  nextIndexToLoad = toLoad.length ? toLoad[toLoad.length - 1].id + 1 : nextIndexToLoad;
}

async function loadAndRender(id) {
  if (cache.has(id)) {
    renderCard(cache.get(id));
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/pokemon/${id}`);
    if (!res.ok) return;

    const d = await res.json();
    const species = await fetch(d.species.url).then(r => r.json()).catch(() => null);

    const cardData = {
      id: d.id,
      name: d.name,
      types: d.types.map(t => t.type.name),
      sprite: d.sprites.other['official-artwork'].front_default || d.sprites.front_default,
      stats: d.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
      weight: d.weight,
      height: d.height,
      abilities: d.abilities.map(a => a.ability.name),
      flavor: species?.flavor_text_entries
        ? (species.flavor_text_entries.find(ft => ft.language.name === 'en') || {}).flavor_text
        : ''
    };

    cache.set(id, cardData);
    renderCard(cardData);

  } catch (e) {
    console.error('fetch error', e);
  }
}

function renderCard(d) {
  const card = document.createElement("article");
  card.className = "card type-" + (d.types[0] || "normal");

  const ornament = document.createElement("div");
  ornament.className = "bg-ornament";

  const primary = d.types[0] || 'normal';
  if (primary === 'fire') ornament.classList.add('ornament-fire');
  else if (primary === 'water' || primary === 'ice') ornament.classList.add('ornament-water');
  else if (primary === 'grass' || primary === 'bug') ornament.classList.add('ornament-grass');
  else if (primary === 'flying') ornament.classList.add('ornament-flying');
  else if (primary === 'electric') ornament.classList.add('ornament-electric');

  card.appendChild(ornament);

  const content = document.createElement("div");
  content.className = "card-content";
  card.appendChild(content);

  const info = document.createElement("div");
  info.className = "info";

  const shortName = shorten(d.name, NAME_LIMIT);

  info.innerHTML = `
    <div class="meta">
      <div class="id">#${String(d.id).padStart(3, "0")}</div>
      <div class="name">${escapeHtml(shortName)}</div>
    </div>

    <div class="types">
      ${d.types.map(t => `<span class="type-pill" style="color:${typeColors[t] || '#fff'}">${t}</span>`).join('')}
    </div>

    <div class="detail">${d.flavor ? shorten(d.flavor, FLAVOR_LIMIT) : ''}</div>

    <div class="stats">
      ${d.stats.slice(0,4).map(s => `<div class="stat">${s.name}: ${s.value}</div>`).join('')}
    </div>
  `;

  content.appendChild(info);

  if (d.sprite) {
    const img = document.createElement("img");
    img.className = "sprite";
    img.src = d.sprite;
    img.alt = d.name;
    content.appendChild(img);
  }

  card.addEventListener('click', () => showModal(d));
  grid.appendChild(card);
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function shorten(s, n) {
  s = s ? s.replace(/\n/g,' ') : '';
  return s.length > n ? s.slice(0, n).trim() + '...' : s;
}

async function search(q) {
  q = String(q).trim().toLowerCase();
  if (!q) return resetView();

  clearGrid();
  loader.style.display = 'block';
  loader.textContent = 'Buscando...';

  if (q.startsWith('#')) q = q.slice(1);

  if (/^\d+$/.test(q)) {
    await loadAndRender(Number(q));
    loader.style.display = 'none';
    return;
  }

  const exact = allList.find(p => p.name === q);
  if (exact) {
    await loadAndRender(exact.id);
    loader.style.display = 'none';
    return;
  }

  const matches = allList.filter(p => p.name.includes(q)).slice(0, 50);
  for (const m of matches) {
    await loadAndRender(m.id);
  }

  if (!matches.length) loader.textContent = 'Nenhum Pokémon encontrado.';
  else loader.style.display = 'none';
}

function clearGrid() {
  grid.innerHTML = '';
}

function resetView() {
  clearGrid();
  nextIndexToLoad = 1;
  loader.style.display = 'none';
  loadRange(nextIndexToLoad, PAGE_SIZE);
}

let modalEl = null;

function showModal(d) {
  if (modalEl) modalEl.remove();

  const m = document.createElement('div');
  m.style.position = 'fixed';
  m.style.inset = 0;
  m.style.display = 'flex';
  m.style.alignItems = 'center';
  m.style.justifyContent = 'center';
  m.style.background = 'rgba(2,6,23,0.6)';
  m.style.zIndex = 9999;

  m.innerHTML = `
    <div style="background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border-radius:14px; padding:20px; width:min(720px,95%); color:inherit; position:relative;">
      <button id='closeModal' style='position:absolute;right:12px;top:12px;background:transparent;border:0;color:inherit;font-size:17px;cursor:pointer'>✕</button>

      <div style='display:flex;gap:18px;align-items:center;flex-wrap:wrap'>
        <img src='${d.sprite}' alt='${d.name}' style='width:160px;height:160px;object-fit:contain;filter:drop-shadow(0 12px 24px rgba(0,0,0,.6))'>

        <div>
          <h2 style='margin:0;text-transform:capitalize'>
            ${d.name}
            <span style='opacity:.7;font-weight:600'>#${String(d.id).padStart(3,'0')}</span>
          </h2>

          <div style='margin-top:6px'>
            ${d.types.map(t => `<span style='padding:6px 8px;border-radius:999px;margin-right:8px;background:rgba(255,255,255,0.04);color:${typeColors[t]}'>${t}</span>`).join('')}
          </div>

          <p style='opacity:.9;margin-top:10px'>${escapeHtml(d.flavor)}</p>

          <div style='display:flex;gap:8px;margin-top:12px;flex-wrap:wrap'>
            <div style='font-size:13px;background:rgba(255,255,255,0.03);padding:8px;border-radius:8px'>
              Altura: ${d.height/10}m
            </div>
            <div style='font-size:13px;background:rgba(255,255,255,0.03);padding:8px;border-radius:8px'>
              Peso: ${d.weight/10}kg
            </div>
            <div style='font-size:13px;background:rgba(255,255,255,0.03);padding:8px;border-radius:8px'>
              Habilidades: ${d.abilities.join(', ')}
            </div>
          </div>
        </div>
      </div>

      <div style='margin-top:14px;display:flex;gap:8px;flex-wrap:wrap'>
        ${d.stats.map(s =>
          `<div style='background:rgba(255,255,255,0.03);padding:8px;border-radius:10px;font-size:13px'>
            ${s.name}: ${s.value}
          </div>`
        ).join('')}
      </div>
    </div>
  `;

  m.querySelector('#closeModal').addEventListener('click', () => m.remove());
  m.addEventListener('click', ev => { if (ev.target === m) m.remove(); });

  document.body.appendChild(m);
  modalEl = m;
}

// events
searchBtn.addEventListener('click', () => search(queryInput.value));
queryInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') search(queryInput.value);
});

resetBtn.addEventListener('click', () => {
  queryInput.value = '';
  clearGrid();
  nextIndexToLoad = 1;
  loader.style.display = 'block';
  loader.textContent = 'Carregando...';
  loadRange(nextIndexToLoad, PAGE_SIZE).then(() => loader.style.display = 'none');
});

loadMoreBtn.addEventListener('click', () => {
  loader.style.display = 'block';
  loader.textContent = 'Carregando mais...';
  loadRange(nextIndexToLoad, PAGE_SIZE).then(() => loader.style.display = 'none');
});

// init
init();
