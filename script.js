const API='https://pokeapi.co/api/v2';
const GEN_RANGES={1:[1,151],2:[152,251],3:[252,386],4:[387,493],5:[494,649],6:[650,721],7:[722,809],8:[810,905],9:[906,1025]};
const grid=document.querySelector('#pokemonGrid'),statusEl=document.querySelector('#status'),countEl=document.querySelector('#resultCount');
const searchInput=document.querySelector('#searchInput'),loadMoreBtn=document.querySelector('#loadMore');
let allPokemon=[],visiblePokemon=[],shown=0,activeGen=0,activeView='all',query='',loading=false;
const favorites=new Set(JSON.parse(localStorage.getItem('pokedex-favorites')||'[]'));
const caught=new Set(JSON.parse(localStorage.getItem('pokedex-caught')||'[]'));
const nameCache={};
const pad=n=>String(n).padStart(4,'0');
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function save(){localStorage.setItem('pokedex-favorites',JSON.stringify([...favorites]));localStorage.setItem('pokedex-caught',JSON.stringify([...caught]));}
function generationFor(id){for(const [g,r] of Object.entries(GEN_RANGES))if(id>=r[0]&&id<=r[1])return Number(g);return 0}
function imgUrl(id){return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`}
function setStatus(msg,error=false){statusEl.textContent=msg;statusEl.classList.toggle('error',error)}
async function loadList(){
 try{
  setStatus('Carregando a lista completa de Pokémon…');
  const res=await fetch(`${API}/pokemon-species?limit=1025`);
  if(!res.ok)throw new Error('Não foi possível carregar a lista.');
  const data=await res.json();
  allPokemon=data.results.map((p,i)=>({id:i+1,name:p.name,url:p.url,gen:generationFor(i+1)}));
  applyFilters();
 }catch(e){setStatus('Não consegui conectar à PokéAPI. Verifique sua internet e tente recarregar a página.',true);countEl.textContent='Sem conexão';}
}
async function getDetails(p){
 if(p.types)return p;
 const res=await fetch(`${API}/pokemon/${p.id}`);
 if(!res.ok)throw new Error('Falha ao carregar Pokémon');
 const d=await res.json();
 p.types=d.types.map(t=>t.type.name);p.height=d.height;p.weight=d.weight;p.stats=d.stats;
 return p;
}
function applyFilters(){
 query=searchInput.value.trim().toLowerCase();
 visiblePokemon=allPokemon.filter(p=>{
  const genOk=!activeGen||p.gen===activeGen;
  const viewOk=activeView==='all'||(activeView==='favorites'&&favorites.has(p.id))||(activeView==='caught'&&caught.has(p.id));
  const searchOk=!query||p.name.includes(query)||String(p.id)===query||pad(p.id).includes(query);
  return genOk&&viewOk&&searchOk;
 });
 shown=0;grid.innerHTML='';renderMore();
 countEl.textContent=`${visiblePokemon.length} Pokémon`;
 setStatus(visiblePokemon.length?'':'Nenhum Pokémon encontrado.');
}
function renderMore(){
 const chunk=visiblePokemon.slice(shown,shown+30);
 chunk.forEach(p=>grid.appendChild(makeCard(p)));
 shown+=chunk.length;loadMoreBtn.hidden=shown>=visiblePokemon.length;
}
function makeCard(p){
 const card=document.createElement('article');card.className='pokemon-card';card.tabIndex=0;
 card.innerHTML=`<span class="poke-number">#${pad(p.id)}</span><div class="card-buttons"><button class="mini-btn ${favorites.has(p.id)?'on':''}" aria-label="Favorito" title="Favorito">${favorites.has(p.id)?'★':'☆'}</button><button class="mini-btn ${caught.has(p.id)?'on':''}" aria-label="Capturado" title="Marcar capturado">${caught.has(p.id)?'✓':'＋'}</button></div><img loading="lazy" src="${imgUrl(p.id)}" alt="${p.name}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png'"><h2>${p.name}</h2><div class="types"><span class="type">Geração ${p.gen||'?'}</span></div>`;
 const btns=card.querySelectorAll('button');
 btns[0].addEventListener('click',e=>{e.stopPropagation();toggleSet(favorites,p.id);btns[0].classList.toggle('on',favorites.has(p.id));btns[0].textContent=favorites.has(p.id)?'★':'☆';save();if(activeView!=='all')applyFilters()});
 btns[1].addEventListener('click',e=>{e.stopPropagation();toggleSet(caught,p.id);btns[1].classList.toggle('on',caught.has(p.id));btns[1].textContent=caught.has(p.id)?'✓':'＋';save();if(activeView!=='all')applyFilters()});
 card.addEventListener('click',()=>showDetails(p));card.addEventListener('keydown',e=>{if(e.key==='Enter')showDetails(p)});
 return card;
}
function toggleSet(set,id){set.has(id)?set.delete(id):set.add(id)}
async function showDetails(p){
 const dlg=document.querySelector('#detailDialog'),content=document.querySelector('#detailContent');
 content.innerHTML=`<div class="detail-hero"><img src="${imgUrl(p.id)}" alt=""><div class="detail-id">#${pad(p.id)}</div><h2>${p.name}</h2><p>Carregando detalhes…</p></div>`;
 dlg.showModal();
 try{
  const d=await getDetails(p);
  content.innerHTML=`<div class="detail-hero"><img src="${imgUrl(p.id)}" alt="${p.name}"><div class="detail-id">#${pad(p.id)} · Geração ${p.gen}</div><h2>${p.name}</h2><div class="types">${d.types.map(t=>`<span class="type">${t}</span>`).join('')}</div></div><div class="detail-stats"><div class="stat"><small>Altura</small><strong>${(d.height/10).toFixed(1)} m</strong></div><div class="stat"><small>Peso</small><strong>${(d.weight/10).toFixed(1)} kg</strong></div>${d.stats.slice(0,4).map(s=>`<div class="stat"><small>${s.stat.name.replace('-',' ')}</small><strong>${s.base_stat}</strong></div>`).join('')}</div><div class="detail-actions"><button id="detailFav">${favorites.has(p.id)?'★ Favorito':'☆ Favoritar'}</button><button class="primary" id="detailCaught">${caught.has(p.id)?'✓ Capturado':'＋ Marcar capturado'}</button></div>`;
  document.querySelector('#detailFav').onclick=()=>{toggleSet(favorites,p.id);save();showDetails(p);if(activeView!=='all')applyFilters()};
  document.querySelector('#detailCaught').onclick=()=>{toggleSet(caught,p.id);save();showDetails(p);if(activeView!=='all')applyFilters()};
 }catch(e){content.innerHTML='<p>Não foi possível carregar os detalhes. Verifique a conexão e tente novamente.</p>'}
}
document.querySelector('#closeDialog').addEventListener('click',()=>document.querySelector('#detailDialog').close());
searchInput.addEventListener('input',applyFilters);
document.querySelectorAll('[data-gen]').forEach(b=>b.addEventListener('click',()=>{activeGen=Number(b.dataset.gen);document.querySelectorAll('[data-gen]').forEach(x=>x.classList.toggle('active',x===b));applyFilters()}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{activeView=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));applyFilters()}));
loadMoreBtn.addEventListener('click',renderMore);
document.querySelector('#navFavorites').addEventListener('click',()=>{activeView='favorites';document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===activeView));applyFilters();window.scrollTo({top:0,behavior:'smooth'})});
document.querySelector('#navCaught').addEventListener('click',()=>{activeView='caught';document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===activeView));applyFilters();window.scrollTo({top:0,behavior:'smooth'})});
let installPrompt=null;const installBtn=document.querySelector('#installBtn');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;installBtn.hidden=false});
installBtn.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installBtn.hidden=true});
loadList();