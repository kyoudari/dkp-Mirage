/* DKP Manager — advanced static UI + GitHub PR support
   Requirements: axios, PapaParse (included via CDN in index.html)
   Data paths: data/players.json, data/transactions.json
*/
const PLAYERS_PATH = "data/players.json";
const TX_PATH = "data/transactions.json";
let state = { players: [], transactions: [], stagedIcons: {} }; // stagedIcons: { className: { name, b64 } }

function getRawUrl(ownerRepo, path) {
  return `https://raw.githubusercontent.com/${ownerRepo}/main/${path}`;
}
function getApiBase(ownerRepo) {
  return `https://api.github.com/repos/${ownerRepo}`;
}
function byId(id){ return document.getElementById(id); }

async function loadData() {
  const repo = byId("repoInput").value.trim();
  if (!repo) { renderEmpty(); return; }
  try {
    const [pResp, tResp] = await Promise.all([
      axios.get(getRawUrl(repo, PLAYERS_PATH)),
      axios.get(getRawUrl(repo, TX_PATH))
    ]);
    state.players = pResp.data;
    state.transactions = tResp.data;
    renderAll();
  } catch(e) {
    console.error(e);
    alert("Ошибка загрузки данных. Проверьте owner/repo и наличие файлов data/players.json и data/transactions.json в ветке main.");
    renderEmpty();
  }
}

function renderAll(){
  renderPlayers();
  renderTx();
  renderIcons();
  fillTxTargets();
  updateEditorPermissions();
}

function renderPlayers(){
  const container = byId("playersTable");
  container.innerHTML = "";
  const q = (byId("searchInput")?.value || "").trim().toLowerCase();
  let list = state.players.slice();
  const sort = byId("sortSelect")?.value || "dkp_desc";
  if(sort === "dkp_desc") list.sort((a,b)=> (b.dkp||0)-(a.dkp||0));
  if(sort === "dkp_asc") list.sort((a,b)=> (a.dkp||0)-(b.dkp||0));
  if(sort === "nick_asc") list.sort((a,b)=> (a.nickname||"").localeCompare(b.nickname||""));
  list = list.filter(p => !q || (p.nickname||"").toLowerCase().includes(q) || (p.class||"").toLowerCase().includes(q));
  list.forEach(p=>{
    const tpl = document.getElementById("playerTpl").content.cloneNode(true);
    const img = tpl.querySelector("img");
    img.src = p.icon || `icons/${(p.class||"unknown")}.png`;
    tpl.querySelector(".nickname").textContent = p.nickname || "";
    tpl.querySelector(".classRole").textContent = `${p.class||""} • ${p.role||"player"}`;
    tpl.querySelector(".dkp").textContent = p.dkp || 0;
    tpl.querySelector(".editBtn").onclick = ()=> openPlayerModal(p.id);
    tpl.querySelector(".delBtn").onclick = ()=> deletePlayer(p.id);
    container.appendChild(tpl);
  });
}

function renderTx(){
  const list = byId("txList");
  if(!list) return;
  list.innerHTML = "";
  state.transactions.slice().reverse().forEach(t=>{
    const el = document.createElement("div");
