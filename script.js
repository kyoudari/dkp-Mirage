// Массив для хранения игроков
let players = [];

// Загрузка данных из localStorage при запуске
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateDisplay();
});

// Модальные окна
const addPlayerModal = document.getElementById('addPlayerModal');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const closeBtn = document.getElementsByClassName('close')[0];

// Открытие модального окна добавления игрока
addPlayerBtn.onclick = function() {
    addPlayerModal.style.display = "block";
}

// Закрытие модального окна
closeBtn.onclick = function() {
    addPlayerModal.style.display = "none";
}

// Закрытие при клике вне окна
window.onclick = function(event) {
    if (event.target == addPlayerModal) {
        addPlayerModal.style.display = "none";
    }
}

// Добавление игрока
document.getElementById('addPlayerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('playerName').value;
    const playerClass = document.getElementById('playerClass').value;
    const initialDkp = parseInt(document.getElementById('initialDkp').value) || 0;
    
    // Проверка на дубликаты
    if (players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('Игрок с таким именем уже существует!');
        return;
    }
    
    const newPlayer = {
        id: Date.now(),
        name: name,
        class: playerClass,
        currentDkp: initialDkp,
        totalEarned: initialDkp,
        totalSpent: 0
    };
    
    players.push(newPlayer);
    updateDisplay();
    saveData();
    
    // Закрыть модальное окно и очистить форму
    addPlayerModal.style.display = "none";
    document.getElementById('addPlayerForm').reset();
});

// Начисление DKP
document.getElementById('addDkpBtn').addEventListener('click', function() {
    const amount = prompt('Сколько DKP начислить всем?');
    const reason = prompt('Причина начисления (например: "Рейд Дракон")');
    
    if (amount && !isNaN(amount)) {
        const dkpAmount = parseInt(amount);
        players.forEach(player => {
            player.currentDkp += dkpAmount;
            player.totalEarned += dkpAmount;
        });
        
        updateDisplay();
        saveData();
        
        document.getElementById('lastRaid').textContent = reason || 'Массовое начисление';
        alert(`Начислено ${dkpAmount} DKP всем игрокам!`);
    }
});

// Трата DKP
document.getElementById('spendDkpBtn').addEventListener('click', function() {
    const playerName = prompt('Имя игрока:');
    const amount = prompt('Сколько DKP потратить?');
    const item = prompt('За что потрачено?');
    
    if (playerName && amount && !isNaN(amount)) {
        const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
        const dkpAmount = parseInt(amount);
        
        if (player) {
            if (player.currentDkp >= dkpAmount) {
                player.currentDkp -= dkpAmount;
                player.totalSpent += dkpAmount;
                updateDisplay();
                saveData();
                alert(`
