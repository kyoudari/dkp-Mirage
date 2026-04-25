// Массив для хранения игроков
let players = [];

// Загрузка данных из localStorage при запуске
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updatePlayerList();
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

    const playerName = document.getElementById('playerName').value;
    const playerClass = document.getElementById('playerClass').value;
    const initialDkp = parseInt(document.getElementById('initialDkp').value);

    // Создание нового игрока
    const newPlayer = {
        name: playerName,
        class: playerClass,
        dkp: initialDkp
    };

    // Добавление игрока в массив
    players.push(newPlayer);

    // Обновление списка игроков
    updatePlayerList();

    // Сброс полей формы
    document.getElementById('playerName').value = '';
    document.getElementById('playerClass').value = '';
    document.getElementById('initialDkp').value = 0;

    // Закрытие модального окна
    addPlayerModal.style.display = "none";
});

// Функция для обновления списка игроков
function updatePlayerList() {
    const playersContainer = document.getElementById('playersContainer');
    playersContainer.innerHTML = '';

    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.classList.add('player');
        playerElement.innerHTML = `
            <h3>${player.name} (${player.class})</h3>
            <p>DKP: ${player.dkp}</p>
        `;
        playersContainer.appendChild(playerElement);
    });
}
