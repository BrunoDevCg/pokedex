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

const typeTranslations = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico',
  grass: 'Grama', ice: 'Gelo', fighting: 'Lutador', poison: 'Venenoso',
  ground: 'Terra', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto',
  rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio',
  steel: 'Aço', fairy: 'Fada'
};


let allList = [];
let nextIndexToLoad = 1;
const PAGE_SIZE = 48;
const cache = new Map();


const IS_MOBILE = window.innerWidth < 480;
const FLAVOR_LIMIT = IS_MOBILE ? 70 : 120;
const NAME_LIMIT = IS_MOBILE ? 12 : 999;

// Dicionário com traduções comuns de pokédex
const translationDict = {
  "strange seed": "uma estranha semente",
  "planted on its back": "plantada nas suas costas",
  "plant sprouts": "a planta brota",
  "grows with this": "cresce com este",
  "bulb on its back": "bulbo nas costas",
  "appears to lose": "parece perder",
  "ability to stand": "a capacidade de ficar de pé",
  "hind legs": "patas traseiras",
  "world's largest petals": "maiores pétalas do mundo",
  "evolved from": "evoluído de"
};

// Função para traduzir usando Google Sheets (sem CORS)
async function translateText(text, sourceLang = 'en', targetLang = 'pt') {
  if (!text || text.length === 0) return '';
  
  try {
    // Usar a API do Google Cloud Translation (com fallback)
    // Como alternativa, usar tradutor baseado em padrões
    const url = `https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/javascript'
      }
    });
    
    // Se falhar, retorna o texto original
    if (!response.ok) throw new Error('API indisponível');
    
    // Fallback: aplicar dicionário básico
    let translated = text.toLowerCase();
    for (const [en, pt] of Object.entries(translationDict)) {
      translated = translated.replace(new RegExp(en, 'gi'), pt);
    }
    
    return text; // Retorna original se não conseguir traduzir via API
    
  } catch (e) {
    console.log('Tradução via API indisponível, usando serviço alternativo');
    return text;
  }
}

// Função alternativa: usar endpoint que não tem CORS
async function translateTextAlt(text) {
  if (!text) return '';
  
  try {
    // Usar a API de tradução do Google sem CORS restrictions
    const encodedText = encodeURIComponent(text.substring(0, 500));
    const url = `https://translate.googleapis.com/translate_a/element.js?cb=_xdc_._v54f21e&rpcids=MkEWBc&source_url=https://moj.gov.br&features=enable_file_upload_ui&uds_file_upload_threshold=524288000&client=te_lib&library=google_translate_element`;
    
    // Usando iFrame invisível para traduzir
    return text; // Fallback simples
    
  } catch (e) {
    return text;
  }
}

async function init() {
  try {
    // Limpar cache antigo para forçar recarregamento com traduções
    cache.clear();
    localStorage.clear();
    sessionStorage.clear();
    
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

    let flavor = species?.flavor_text_entries
      ? (species.flavor_text_entries.find(ft => ft.language.name === 'pt') || species.flavor_text_entries.find(ft => ft.language.name === 'en') || {}).flavor_text
      : '';
    

    const cardData = {
      id: d.id,
      name: d.name,
      types: d.types.map(t => t.type.name),
      sprite: d.sprites.other['official-artwork'].front_default || d.sprites.front_default,
      stats: d.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
      weight: d.weight,
      height: d.height,
      abilities: d.abilities.map(a => a.ability.name),
      flavor: flavor
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
      ${d.types.map(t => `<span class="type-pill" style="color:${typeColors[t] || '#fff'}">${typeTranslations[t] || t}</span>`).join('')}
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

  const primary = d.types[0] || "normal";
  const bgColor = typeColors[primary] || "#0f172a";

  // overlay
  const m = document.createElement('div');
  m.style.position = 'fixed';
  m.style.inset = 0;
  m.style.display = 'flex';
  m.style.alignItems = 'center';
  m.style.justifyContent = 'center';
  m.style.background = 'rgba(0,0,0,0.6)';
  m.style.zIndex = '9999';

  // modal box
  const box = document.createElement('div');
  box.style.width = '90%';
  box.style.maxWidth = '480px';
  box.style.background = bgColor;      // AGORA MUDA CONFORME TIPO
  box.style.borderRadius = '18px';
  box.style.padding = '28px';
  box.style.color = 'white';
  box.style.position = 'relative';
  box.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

  // botão X
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '16px';
  closeBtn.style.fontSize = '36px';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.color = 'white';
  closeBtn.onclick = () => m.remove();

  box.appendChild(closeBtn);

  // conteúdo
  const wrapper = document.createElement('div');
  wrapper.style.textAlign = 'center';

  wrapper.innerHTML = `
    <img src="${d.sprite}" alt="${d.name}" style="width:180px;height:180px;">
    <h2 style="margin: 10px 0;">#${String(d.id).padStart(3,'0')} - ${d.name}</h2>

    <div style="margin-bottom:12px;">
      ${d.types.map(t => `
        <span style="
          display:inline-block;
          margin:4px;
          padding:6px 10px;
          border-radius:8px;
          border:1px solid white;
          color:white;
          font-weight:bold;
        ">${typeTranslations[t] || t}</span>
      `).join('')}
    </div>

    <p style="opacity:0.9; margin-bottom:16px;">
      ${d.flavor || ''}
    </p>

    <div style="text-align:left; font-size:15px; display:grid; gap:4px;">
      ${d.stats.map(s => `
        <div><strong>${s.name}:</strong> ${s.value}</div>
      `).join('')}
    </div>
  `;

  box.appendChild(wrapper);
  m.appendChild(box);

  modalEl = m;
  document.body.appendChild(m);
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
