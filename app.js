// Medium UI DKP Manager — updated visuals and UX
const PLAYERS_PATH = "data/players.json";
const TX_PATH = "data/transactions.json";
let state = { players: [], transactions: [] };

const byId = id => document.getElementById(id);
const toastRoot = () => byId("toastRoot");

function toast(msg, timeout = 3000) {
  const el = document.createElement("div");
  el.className = "bg-slate-700 text-white px-4 py-2 rounded mb-2 shadow";
  el.textContent = msg;
  toastRoot().appendChild(el);
  setTimeout(()=> { el.remove(); }, timeout);
}

function getRawUrl(repo, path){ return `https://raw.githubusercontent.com/${repo}/main/${path}`; }

async function loadData(){
  const repo = byId("repoInput").value.trim();
  if(!repo){ renderEmpty(); return; }
  try{
    const [pRes, tRes] = await Promise.all([
      fetch(getRawUrl(repo, PLAYERS_PATH)).then(r=>r.ok? r.json(): Promise.reject(r.status)),
      fetch(getRawUrl(repo, TX_PATH)).then(r=>r.ok? r.json(): Promise.reject(r.status))
    ]);
    state.players = pRes;
    state.transactions = tRes;
    renderAll();
    toast("Data loaded");
  }catch(e){
    console.error(e);
    toast("Ошибка загрузки данных");
    renderEmpty();
  }
}

function renderAll(){
  renderPlayers();
  renderTx();
  fillTxTargets();
  updateEditorPermissions();
}

function renderPlayers(){
  const grid = byId("playersGrid"); grid.innerHTML = "";
  const q = (byId("searchInput")?.value || "").toLowerCase();
  let list = state.players.slice();
  const sort = byId("sortSelect")?.value || "dkp_desc";
  if(sort === "dkp_desc") list.sort((a,b)=> (b.dkp||0)-(a.dkp||0));
  if(sort === "dkp_asc") list.sort((a,b)=> (a.dkp||0)-(b.dkp||0));
  if(sort === "nick_asc") list.sort((a,b)=> (a.nickname||"").localeCompare(b.nickname||""));

  list = list.filter(p => !q || (p.nickname||"").toLowerCase().includes(q) || (p.class||"").toLowerCase().includes(q));

  list.forEach(p=>{
    const tpl = document.getElementById("playerCardTpl").content.cloneNode(true);
    tpl.querySelector("img").src = p.icon || `icons/${(p.class||"unknown")}.svg`;
    tpl.querySelector(".nickname").textContent = p.nickname || "";
    tpl.querySelector(".classRole").textContent = `${p.class||""} • ${p.role||"player"}`;
    tpl.querySelector(".dkp").textContent = p.dkp || 0;
    tpl.querySelector(".editBtn").onclick = ()=> openPlayerModal(p.id);
    tpl.querySelector(".delBtn").onclick = ()=> deletePlayer(p.id);
    grid.appendChild(tpl);
  });
}

function renderTx(){
  const list = byId("txList"); list.innerHTML = "";
  state.transactions.slice().reverse().forEach(t=>{
    const el = document.createElement("div");
    el.className = "p-2 bg-slate-800 rounded flex justify-between";
    el.innerHTML = `<div class="text-sm">${new Date(t.date).toLocaleString()} — <b>${t.author}</b> → ${t.targetName}: ${t.amount}</div><div class="text-sm text-slate-400">${t.reason||""}</div>`;
    list.appendChild(el);
  });
}

function renderEmpty(){
  byId("playersGrid").innerHTML = "<div class='p-4 text-sm text-slate-400'>Введите owner/repo и нажмите Enter</div>";
  byId("txList").innerHTML = "";
}

function fillTxTargets(){
  const sel = byId("txTarget"); if(!sel) return; sel.innerHTML = "";
  state.players.forEach(p=>{
    const opt = document.createElement("option"); opt.value = p.id; opt.textContent = `${p.nickname} (${p.class||""}) — ${p.dkp||0}`; sel.appendChild(opt);
  });
}

/* Modal: add / edit player */
function openPlayerModal(id){
  const modal = byId("modal"), form = byId("playerForm");
  const nick = byId("p_nickname"), cls = byId("p_class"), ic = byId("p_icon"), dkp = byId("p_dkp");
  if(id){
    const p = state.players.find(x=>x.id===id); if(!p) return;
    byId("modalTitle").textContent = "Edit player";
    nick.value = p.nickname||""; cls.value = p.class||""; ic.value = p.icon||""; dkp.value = p.dkp||0;
    form.onsubmit = e => { e.preventDefault(); p.nickname = nick.value.trim(); p.class = cls.value.trim(); p.icon = ic.value.trim()||undefined; p.dkp = parseInt(dkp.value,10)||0; modal.classList.add("hidden"); renderAll(); toast("Player updated"); };
  } else {
    byId("modalTitle").textContent = "Add player";
    nick.value=""; cls.value=""; ic.value=""; dkp.value=0;
    form.onsubmit = e => { e.preventDefault(); const idNew = Date.now().toString(36); state.players.push({ id:idNew, nickname: nick.value.trim(), class: cls.value.trim(), role:"player", icon: ic.value.trim()||undefined, dkp: parseInt(dkp.value,10)||0 }); modal.classList.add("hidden"); renderAll(); toast("Player added"); };
  }
  byId("modalCancel").onclick = ()=> modal.classList.add("hidden");
  modal.classList.remove("hidden");
}

function deletePlayer(id){
  const editor = (byId("editorName")?.value||"").trim();
  if(!isEditorOfficer(editor)){ alert("Only officers can delete players."); return; }
  if(!confirm("Удалить игрока?")) return;
  state.players = state.players.filter(x=>x.id!==id);
  renderAll();
  toast("Player removed");
}

function addTransaction(author){
  const targetId = byId("txTarget")?.value; const amount = parseInt(byId("txAmount")?.value,10); const reason = byId("txReason")?.value.trim();
  if(!targetId || !amount){ alert("Выберите цель и укажите сумму (не 0)."); return; }
  const target = state.players.find(p=>p.id===targetId); if(!target){ alert("Игрок не найден"); return; }
  const tx = { id: Date.now().toString(36), date: new Date().toISOString(), author, targetId, targetName: target.nickname, amount, reason };
  state.transactions.push(tx); target.dkp = (target.dkp||0) + amount; renderAll(); toast("Transaction added");
  if(byId("txAmount")) byId("txAmount").value = ""; if(byId("txReason")) byId("txReason").value = "";
}

function isEditorOfficer(name){ if(!name) return false; return state.players.some(p=>p.nickname===name && p.role==="officer"); }
function updateEditorPermissions(){ const allowed = isEditorOfficer((byId("editorName")?.value||"").trim()); document.querySelectorAll(".editBtn, .delBtn, #openPRBtn, #addPlayerBtn").forEach(b=>{ if(!b) return; b.disabled = !allowed; b.classList.toggle("opacity-50", !allowed); }); }

/* Export / Import */
function exportJSON(){ const blob = new Blob([JSON.stringify(state.players, null,2)], {type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="players.json"; document.body.appendChild(a); a.click(); a.remove(); }
function handleImportFile(file){ const r=new FileReader(); r.onload=()=>{ try{ const arr=JSON.parse(r.result); if(Array.isArray(arr)){ arr.forEach(x=>{ if(!x.id) x.id = Date.now().toString(36)+Math.random().toString(36).slice(2,6); x.dkp = parseInt(x.dkp,10)||0; state.players.push(x); }); renderAll(); toast("Imported players"); } else toast("JSON должен быть массивом"); }catch(e){ toast("Invalid JSON"); } }; r.readAsText(file); }

/* Create PR (same flow as before) */
async function createPR(){
  const token = (byId("githubToken")?.value||"").trim(); const repo = (byId("repoInput")?.value||"").trim();
  if(!token || !repo){ toast("Укажите token и owner/repo"); return; }
  if(!isEditorOfficer((byId("editorName")?.value||"").trim())){ if(!confirm("You are not listed as officer. Continue?")) return; }

  const apiBase = `https://api.github.com/repos/${repo}`;
  const branch = `dkp-update-${Date.now().toString(36)}`;
  try{
    const ref = await fetch(`${apiBase}/git/ref/heads/main`, { headers:{ Authorization:`token ${token}` } }); if(!ref.ok) throw await ref.text();
    const main = await ref.json(); const mainSha = main.object.sha;
    await fetch(`${apiBase}/git/refs`, { method:"POST", headers:{ Authorization:`token ${token}`, "Content-Type":"application/json" }, body: JSON.stringify({ ref:`refs/heads/${branch}`, sha: mainSha })});
    const getFile = async path => { try{ const r=await fetch(`${apiBase}/contents/${encodeURIComponent(path)}?ref=main`, { headers:{ Authorization:`token ${token}` } }); if(!r.ok) return null; return await r.json(); }catch(e){ return null; } };
    const putFile = async (path, b64, msg, br, sha) => { const payload = { message: msg, content: b64, branch: br }; if(sha) payload.sha = sha; await fetch(`${apiBase}/contents/${encodeURIComponent(path)}`, { method:"PUT", headers:{ Authorization:`token ${token}`, "Content-Type":"application/json" }, body: JSON.stringify(payload) }); };

    const playersB64 = btoa(unescape(encodeURIComponent(JSON.stringify(state.players, null,2))));
    const txB64 = btoa(unescape(encodeURIComponent(JSON.stringify(state.transactions || [], null,2))));
    const pf = await getFile(PLAYERS_PATH); await putFile(PLAYERS_PATH, playersB64, "Update players.json via UI", branch, pf && pf.sha);
    const tf = await getFile(TX_PATH); await putFile(TX_PATH, txB64, "Update transactions.json via UI", branch, tf && tf.sha);
    const pr = await fetch(`${apiBase}/pulls`, { method:"POST", headers:{ Authorization:`token ${token}`, "Content-Type":"application/json" }, body: JSON.stringify({ title:"DKP update via UI", head:branch, base:"main", body:"Update from DKP UI" })});
    const prj = await pr.json(); toast("PR created"); window.open(prj.html_url, "_blank");
  }catch(err){ console.error(err); toast("PR error: "+(err.message||err)); }
}

/* Events */
window.addEventListener("DOMContentLoaded", ()=>{
  byId("repoInput")?.addEventListener("change", loadData);
  byId("addPlayerBtn")?.addEventListener("click", ()=> openPlayerModal());
  byId("txForm")?.addEventListener("submit", e=>{ e.preventDefault(); addTransaction((byId("editorName")?.value||"web-ui").trim()); });
  byId("openPRBtn")?.addEventListener("click", createPR);
  byId("exportBtn")?.addEventListener("click", exportJSON);
  byId("importBtn")?.addEventListener("click", ()=> byId("fileInput")?.click());
  // hidden file input for import
  const fi = document.createElement("input"); fi.type="file"; fi.accept=".json"; fi.style.display="none"; document.body.appendChild(fi);
  fi.addEventListener("change", e=>{ if(e.target.files && e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value=""; });
  byId("searchInput")?.addEventListener("input", renderPlayers);
  byId("sortSelect")?.addEventListener("change", renderPlayers);
  renderEmpty();
});
