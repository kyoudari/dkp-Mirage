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
    img.src = p.icon || `icons/${(p.class||"unknown")}.svg`;
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
    el.className = "p-2 bg-gray-900 rounded flex justify-between";
    const left = document.createElement("div");
    left.className = "text-sm";
    left.innerHTML = `${new Date(t.date).toLocaleString()} — <b>${t.author}</b> → ${t.targetName||t.targetId}: ${t.amount}`;
    const right = document.createElement("div");
    right.className = "text-sm text-gray-400";
    right.textContent = t.reason || "";
    el.appendChild(left);
    el.appendChild(right);
    list.appendChild(el);
  });
}

function renderIcons(){
  const grid = byId("iconsGrid");
  if(!grid) return;
  grid.innerHTML = "";
  const classes = Array.from(new Set(state.players.map(p=>p.class).filter(Boolean)));
  classes.forEach(c=>{
    const img = document.createElement("img");
    img.src = `icons/${c}.svg`;
    img.className = "w-12 h-12 rounded bg-gray-700";
    img.title = c;
    grid.appendChild(img);
  });
  Object.keys(state.stagedIcons).forEach(c=>{
    const d = state.stagedIcons[c];
    const img = document.createElement("img");
    img.src = d.b64;
    img.className = "w-12 h-12 rounded border-2 border-emerald-500";
    img.title = c + " (staged)";
    grid.appendChild(img);
  });
}

function renderEmpty(){
  byId("playersTable").innerHTML = "<div class='p-4 text-sm text-gray-400'>Введите owner/repo и нажмите Enter</div>";
}

function fillTxTargets(){
  const sel = byId("txTarget");
  if(!sel) return;
  sel.innerHTML = "";
  state.players.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.nickname} (${p.class||""}) — ${p.dkp||0}`;
    sel.appendChild(opt);
  });
}

function dialogAddPlayer(){ openPlayerModal(); }
function openPlayerModal(id){
  const modal = byId("modal");
  const title = byId("modalTitle");
  const form = byId("playerForm");
  const p_nickname = byId("p_nickname");
  const p_class = byId("p_class");
  const p_role = byId("p_role");
  const p_dkp = byId("p_dkp");
  const p_icon = byId("p_icon");
  if(!modal || !form) return;

  if(id){
    title.textContent = "Edit player";
    const p = state.players.find(x=>x.id===id);
    if(!p) return;
    p_nickname.value = p.nickname || "";
    p_class.value = p.class || "";
    p_role.value = p.role || "player";
    p_dkp.value = p.dkp || 0;
    p_icon.value = p.icon || "";
    form.onsubmit = (e)=>{
      e.preventDefault();
      p.nickname = p_nickname.value.trim();
      p.class = p_class.value.trim();
      p.role = p_role.value;
      p.dkp = parseInt(p_dkp.value,10)||0;
      p.icon = p_icon.value.trim() || p.icon;
      modal.classList.add("hidden");
      renderAll();
    };
  } else {
    title.textContent = "Add player";
    p_nickname.value = "";
    p_class.value = "";
    p_role.value = "player";
    p_dkp.value = 0;
    p_icon.value = "";
    form.onsubmit = (e)=>{
      e.preventDefault();
      const idNew = Date.now().toString(36);
      const player = {
        id: idNew,
        nickname: p_nickname.value.trim(),
        class: p_class.value.trim(),
        role: p_role.value,
        dkp: parseInt(p_dkp.value,10)||0,
        icon: p_icon.value.trim() || undefined
      };
      state.players.push(player);
      modal.classList.add("hidden");
      renderAll();
    };
  }

  byId("modalCancel").onclick = ()=> modal.classList.add("hidden");
  modal.classList.remove("hidden");
}

function deletePlayer(id){
  const editor = (byId("editorName")?.value || "").trim();
  if(!isEditorOfficer(editor)){ alert("Only officers can delete players."); return; }
  if(!confirm("Удалить игрока?")) return;
  state.players = state.players.filter(x=>x.id!==id);
  renderAll();
}

function addTransaction(author){
  const targetId = byId("txTarget")?.value;
  const amount = parseInt(byId("txAmount")?.value,10);
  const reason = (byId("txReason")?.value || "").trim();
  if(!targetId || !amount){ alert("Выберите цель и укажите сумму (не 0)."); return; }
  const target = state.players.find(p=>p.id===targetId);
  if(!target){ alert("Игрок не найден"); return; }
  const tx = { id: Date.now().toString(36), date: new Date().toISOString(), author, targetId, targetName: target.nickname, amount, reason };
  state.transactions.push(tx);
  target.dkp = (target.dkp||0) + amount;
  renderAll();
  if(byId("txAmount")) byId("txAmount").value = "";
  if(byId("txReason")) byId("txReason").value = "";
}

function isEditorOfficer(editorName){
  if(!editorName) return false;
  return state.players.some(p => p.nickname === editorName && p.role === "officer");
}
function updateEditorPermissions(){
  const editor = (byId("editorName")?.value || "").trim();
  const allowed = isEditorOfficer(editor);
  document.querySelectorAll(".editBtn, .delBtn, #openPRBtn, #addPlayerBtn, #uploadIconBtn").forEach(btn=>{
    if(!btn) return;
    btn.disabled = !allowed;
    btn.classList.toggle("opacity-50", !allowed);
  });
}

function exportPlayersJSON(){
  const blob = new Blob([JSON.stringify(state.players, null, 2)], {type: "application/json"});
  downloadBlob(blob, "players.json");
}
function exportPlayersCSV(){
  const csv = Papa.unparse(state.players.map(p=>({
    id: p.id, nickname: p.nickname, class: p.class, role: p.role, dkp: p.dkp, icon: p.icon
  })));
  const blob = new Blob([csv], {type: "text/csv"});
  downloadBlob(blob, "players.csv");
}
function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function handleFileOpen(file){
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = ()=>{
    try {
      if(ext === "json"){
        const obj = JSON.parse(reader.result);
        if(Array.isArray(obj)) {
          if(obj.length && obj[0].nickname !== undefined){
            obj.forEach(r=>{
              if(!r.id) r.id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
              r.dkp = parseInt(r.dkp,10) || 0;
              state.players.push(r);
            });
            renderAll();
            alert("Players imported (merged).");
          } else {
            alert("JSON загружен, но не распознан как список игроков.");
          }
        } else {
          alert("Unsupported JSON structure.");
        }
      } else if(ext === "csv") {
        Papa.parse(reader.result, { header: true, skipEmptyLines: true, complete: (res)=>{
          res.data.forEach(r=>{
            if(!r.id) r.id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
            r.dkp = parseInt(r.dkp,10) || 0;
            state.players.push(r);
          });
          renderAll();
          alert("CSV импортирован (merged).");
        }});
      } else {
        alert("Unsupported file type.");
      }
    } catch(err){
      console.error(err);
      alert("Ошибка при импорте файла.");
    }
  };
  reader.readAsText(file);
}

function handleIconFile(file, className){
  const reader = new FileReader();
  reader.onload = ()=>{
    const b64 = reader.result;
    if(!className) { alert("Укажите имя класса для иконки."); return; }
    state.stagedIcons[className] = { name: `${className}.svg`, b64 };
    renderIcons();
    alert(`Icon for "${className}" staged (will be included in PR).`);
  };
  reader.readAsDataURL(file);
}

async function createPRCommit(){
  const token = (byId("githubToken")?.value || "").trim();
  const repo = (byId("repoInput")?.value || "").trim();
  const editor = (byId("editorName")?.value || "").trim();
  if(!token || !repo){ alert("Укажите токен и owner/repo"); return; }
  if(!isEditorOfficer(editor)){ if(!confirm("You are not listed as officer. Continue?")) return; }

  const apiBase = getApiBase(repo);
  const branchName = `dkp-update-${Date.now().toString(36)}`;

  try {
    const refResp = await axios.get(`${apiBase}/git/ref/heads/main`, { headers: { Authorization: `token ${token}` } });
    const mainSha = refResp.data.object.sha;

    await axios.post(`${apiBase}/git/refs`, { ref: `refs/heads/${branchName}`, sha: mainSha }, { headers: { Authorization: `token ${token}` } });

    const getFile = async (path) => {
      try {
        const r = await axios.get(`${apiBase}/contents/${encodeURIComponent(path)}?ref=main`, { headers: { Authorization: `token ${token}` } });
        return r.data;
      } catch(e) { return null; }
    };
    const putFile = async (path, contentB64, message, branch, sha) => {
      const payload = { message, content: contentB64, branch };
      if (sha) payload.sha = sha;
      return axios.put(`${apiBase}/contents/${encodeURIComponent(path)}`, payload, { headers: { Authorization: `token ${token}` } });
    };

    // prepare files (base64)
    const playersB64 = btoa(unescape(encodeURIComponent(JSON.stringify(state.players, null, 2))));
    const txB64 = btoa(unescape(encodeURIComponent(JSON.stringify(state.transactions, null, 2))));

    // update players.json
    const playersFile = await getFile(PLAYERS_PATH);
    await putFile(PLAYERS_PATH, playersB64, `Update players.json via DKP UI`, branchName, playersFile && playersFile.sha);

    // update transactions.json
    const txFile = await getFile(TX_PATH);
    await putFile(TX_PATH, txB64, `Update transactions.json via DKP UI`, branchName, txFile && txFile.sha);

    // staged icons (if any) — strip data:*;base64, prefix and commit
    for (const className of Object.keys(state.stagedIcons)) {
      const d = state.stagedIcons[className];
      const idx = d.b64.indexOf('base64,');
      const rawB64 = idx >= 0 ? d.b64.slice(idx + 7) : d.b64;
      const iconPath = `icons/${d.name}`;
      const iconFile = await getFile(iconPath);
      await putFile(iconPath, rawB64, `Add/update icon ${d.name} via DKP UI`, branchName, iconFile && iconFile.sha);
    }

    // create PR
    const prResp = await axios.post(`${apiBase}/pulls`, {
      title: "DKP data update via web UI",
      head: branchName,
      base: "main",
      body: "Этот PR обновляет players.json и transactions.json через веб-интерфейс DKP Manager."
    }, { headers: { Authorization: `token ${token}` } });

    alert("PR created: " + prResp.data.html_url);
    state.stagedIcons = {};
    renderIcons();
  } catch (err) {
    console.error(err);
    const msg = err?.response?.data?.message || err.message || "Unknown error";
    alert("Ошибка при создании PR: " + msg);
  }
}

/* --- Event bindings --- */
window.addEventListener("DOMContentLoaded", ()=>{
  const repoInput = byId("repoInput");
  if(repoInput) repoInput.addEventListener("change", loadData);
  const addPlayerBtn = byId("addPlayerBtn");
  if(addPlayerBtn) addPlayerBtn.addEventListener("click", dialogAddPlayer);
  const txForm = byId("txForm");
  if(txForm) txForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const editor = (byId("editorName")?.value || "web-ui").trim();
    addTransaction(editor);
  });
  const openPRBtn = byId("openPRBtn");
  if(openPRBtn) openPRBtn.addEventListener("click", createPRCommit);

  const exportPlayersBtn = byId("exportPlayersBtn");
  if(exportPlayersBtn) exportPlayersBtn.addEventListener("click", exportPlayersJSON);
  const exportCSVBtn = byId("exportCSVBtn");
  if(exportCSVBtn) exportCSVBtn.addEventListener("click", exportPlayersCSV);

  const openFileBtn = byId("openFileBtn");
  if(openFileBtn) openFileBtn.addEventListener("click", ()=> byId("fileInput").click());
  const fileInput = byId("fileInput");
  if(fileInput) fileInput.addEventListener("change", (e)=> {
    if(e.target.files && e.target.files[0]) handleFileOpen(e.target.files[0]);
    e.target.value = "";
  });

  const iconFile = byId("iconFile");
  const iconClassName = byId("iconClassName");
  const uploadIconBtn = byId("uploadIconBtn");
  if(uploadIconBtn) uploadIconBtn.addEventListener("click", ()=>{
    if(!iconFile || !iconFile.files || !iconFile.files[0]) { alert("Выберите файл и укажите имя класса."); return; }
    const cls = (iconClassName?.value || "").trim();
    if(!cls){ alert("Укажите имя класса в поле 'Class name for icon'."); return; }
    handleIconFile(iconFile.files[0], cls);
    iconFile.value = "";
    iconClassName.value = "";
  });

  const searchInput = byId("searchInput");
  if(searchInput) searchInput.addEventListener("input", renderPlayers);
  const sortSelect = byId("sortSelect");
  if(sortSelect) sortSelect.addEventListener("change", renderPlayers);

  renderEmpty();
});
