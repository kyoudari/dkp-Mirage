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
    const initialDkp
