<script>
        document.addEventListener('DOMContentLoaded', function() {
            // Estado del juego
            const gameState = {
                tokens: [],
                diceHistory: [],
                currentRoll: null,
                boardBackground: null,
                rows: 15,
                cols: 15,
                cellOpacity: 0.7,
                editingToken: null,
                currentObject: null,
                currentUser: null,
                users: {},
                gameId: null,
                userColor: getRandomColor(),
                userName: `Jugador${Math.floor(Math.random() * 1000)}`,
                isHost: false,
                leaderId: null
            };
            
            // Conexión con el servidor Socket.IO
            // Cambia esta URL si estás ejecutando el servidor en otro lugar
            const socket = io({
                autoConnect: false
            });
            
            // Elementos del DOM
            const gameBoard = document.getElementById('gameBoard');
            const rollSingleBtn = document.getElementById('rollSingle');
            const rollDoubleBtn = document.getElementById('rollDouble');
            const rollTripleBtn = document.getElementById('rollTriple');
            const clearHistoryBtn = document.getElementById('clearHistory');
            const saveGameBtn = document.getElementById('saveGame');
            const loadGameBtn = document.getElementById('loadGame');
            const gameFileInput = document.getElementById('gameFile');
            const currentRollElement = document.getElementById('currentRoll');
            const diceHistoryElement = document.getElementById('diceHistory');
            const addTokenBtn = document.getElementById('addToken');
            const mapImageInput = document.getElementById('mapImage');
            const loadMapBtn = document.getElementById('loadMap');
            const charImageInput = document.getElementById('charImage');
            const rowsInput = document.getElementById('rows');
            const colsInput = document.getElementById('cols');
            const cellOpacityInput = document.getElementById('cellOpacity');
            const opacityValue = document.getElementById('opacityValue');
            const tokenEditForm = document.getElementById('tokenEditForm');
            const overlay = document.getElementById('overlay');
            const editNameInput = document.getElementById('editName');
            const editHPInput = document.getElementById('editHP');
            const editDescInput = document.getElementById('editDesc');
            const saveTokenChangesBtn = document.getElementById('saveTokenChanges');
            const deleteTokenBtn = document.getElementById('deleteToken');
            const closeEditFormBtn = document.getElementById('closeEditForm');
            const objectModal = document.getElementById('objectModal');
            const objectDescription = document.getElementById('objectDescription');
            const closeObjectModal = document.getElementById('closeObjectModal');
            const editObjectBtn = document.getElementById('editObject');
            const deleteObjectBtn = document.getElementById('deleteObject');
            const charTypeSelect = document.getElementById('charType');
            const hpContainer = document.getElementById('hpContainer');
            const descContainer = document.getElementById('descContainer');
            const charDescInput = document.getElementById('charDesc');
            const editHpContainer = document.getElementById('editHpContainer');
            const editDescContainer = document.getElementById('editDescContainer');
            const statusIndicator = document.getElementById('statusIndicator');
            const onlineStatus = document.getElementById('onlineStatus');
            const onlineUsers = document.getElementById('onlineUsers');
            const gameIdDisplay = document.getElementById('gameIdDisplay');
            const copyGameIdBtn = document.getElementById('copyGameId');
            const joinGameBtn = document.getElementById('joinGameBtn');
            const joinModal = document.getElementById('joinModal');
            const gameIdInput = document.getElementById('gameIdInput');
            const joinGameAction = document.getElementById('joinGameAction');
            const cancelJoin = document.getElementById('cancelJoin');
            const onlineNotification = document.getElementById('onlineNotification');
            const notificationText = document.getElementById('notificationText');
            const playerManagement = document.getElementById('playerManagement');
            const playerList = document.getElementById('playerList');
            
            // Eventos de conexión Socket.io
            socket.on('connect', () => {
                console.log('Conectado al servidor');
                statusIndicator.classList.add('online');
                onlineStatus.textContent = 'Online';
                
                // Si somos el líder, crear la sesión
                if (gameState.isHost) {
                    socket.emit('create-session', {
                        gameId: gameState.gameId,
                        leader: {
                            id: socket.id,
                            name: gameState.userName,
                            color: gameState.userColor
                        }
                    });
                }
            });
            
            socket.on('disconnect', () => {
                console.log('Desconectado del servidor');
                statusIndicator.classList.remove('online');
                onlineStatus.textContent = 'Desconectado';
            });
            
            // Eventos del juego
            socket.on('session-created', (data) => {
                console.log('Sesión creada:', data.gameId);
                gameState.leaderId = data.leaderId;
                gameIdDisplay.textContent = `ID: ${gameState.gameId}`;
            });
            
            socket.on('player-joined', (player) => {
                console.log('Jugador unido:', player.name);
                // Solo agregar si no existe
                if (!gameState.users[player.id]) {
                    gameState.users[player.id] = player;
                    updateOnlineUsers();
                    showNotification(`¡${player.name} se ha unido a la partida!`);
                }
            });
            
            socket.on('player-left', (playerId) => {
                console.log('Jugador abandonó:', playerId);
                if (gameState.users[playerId]) {
                    showNotification(`${gameState.users[playerId].name} ha abandonado la partida`);
                    delete gameState.users[playerId];
                    updateOnlineUsers();
                    
                    // Eliminar fichas del jugador
                    gameState.tokens = gameState.tokens.filter(token => token.userId !== playerId);
                    initBoard();
                }
            });
            
            socket.on('update-game-state', (state) => {
                console.log('Estado actualizado:', state);
                // Actualizar estado local
                gameState.tokens = state.tokens;
                gameState.diceHistory = state.diceHistory;
                gameState.currentRoll = state.currentRoll;
                gameState.boardBackground = state.boardBackground;
                gameState.rows = state.rows;
                gameState.cols = state.cols;
                gameState.cellOpacity = state.cellOpacity;
                
                // Actualizar UI
                initBoard();
                updateDiceUI();
                
                // Actualizar inputs
                rowsInput.value = gameState.rows;
                colsInput.value = gameState.cols;
                cellOpacityInput.value = gameState.cellOpacity * 100;
                opacityValue.textContent = `${Math.round(gameState.cellOpacity * 100)}%`;
                
                // Establecer fondo del tablero
                if (gameState.boardBackground) {
                    gameBoard.style.backgroundImage = `url(${gameState.boardBackground})`;
                } else {
                    gameBoard.style.backgroundImage = '';
                }
            });
            
            socket.on('dice-rolled', (rollData) => {
                gameState.currentRoll = rollData;
                gameState.diceHistory.push(rollData);
                updateDiceUI();
            });
            
            socket.on('token-created', (token) => {
                // Solo agregar si no existe
                if (!gameState.tokens.some(t => t.id === token.id)) {
                    gameState.tokens.push(token);
                    renderToken(token);
                }
            });
            
            socket.on('token-updated', (token) => {
                const index = gameState.tokens.findIndex(t => t.id === token.id);
                if (index !== -1) {
                    gameState.tokens[index] = token;
                    renderToken(token);
                }
            });
            
            socket.on('token-deleted', (tokenId) => {
                gameState.tokens = gameState.tokens.filter(t => t.id !== tokenId);
                const tokenElement = document.getElementById(tokenId);
                if (tokenElement) tokenElement.remove();
            });
            
            socket.on('session-error', (message) => {
                alert(`Error: ${message}`);
            });
            
            socket.on('kicked', () => {
                alert('Has sido expulsado de la partida por el líder.');
                location.reload();
            });
            
            // Inicializar el tablero
            function initBoard() {
                gameBoard.innerHTML = '';
                
                // Configurar grid
                gameBoard.style.gridTemplateColumns = `repeat(${gameState.cols}, 1fr)`;
                gameBoard.style.gridTemplateRows = `repeat(${gameState.rows}, 1fr)`;
                
                // Crear celdas
                for (let row = 0; row < gameState.rows; row++) {
                    for (let col = 0; col < gameState.cols; col++) {
                        const cell = document.createElement('div');
                        cell.className = 'cell';
                        cell.dataset.row = row;
                        cell.dataset.col = col;
                        cell.style.backgroundColor = `rgba(52, 73, 94, ${gameState.cellOpacity})`;
                        
                        // Preparar para arrastrar
                        cell.addEventListener('dragover', handleDragOver);
                        cell.addEventListener('drop', handleDrop);
                        
                        gameBoard.appendChild(cell);
                    }
                }
                
                // Establecer fondo si existe
                if (gameState.boardBackground) {
                    gameBoard.style.backgroundImage = `url(${gameState.boardBackground})`;
                }
                
                // Renderizar fichas existentes
                gameState.tokens.forEach(token => renderToken(token));
            }
            
            // Función para crear una nueva ficha
            function createToken(name, type, hp, image = null, description = "", row = null, col = null, userId = null) {
                const tokenId = `token_${Date.now()}`;
                const token = {
                    id: tokenId,
                    name,
                    type,
                    hp,
                    description,
                    image,
                    row,
                    col,
                    userId: userId || socket.id
                };
                
                // Enviar al servidor
                if (gameState.gameId) {
                    socket.emit('create-token', token);
                }
                
                return token;
            }
            
            // Renderizar una ficha en el tablero
            function renderToken(token) {
                if (token.row === null || token.col === null) return;
                
                // Eliminar cualquier representación anterior de esta ficha
                const existingToken = document.getElementById(token.id);
                if (existingToken) existingToken.remove();
                
                const cell = document.querySelector(`.cell[data-row="${token.row}"][data-col="${token.col}"]`);
                if (!cell) return;
                
                const tokenElement = document.createElement('div');
                tokenElement.id = token.id;
                tokenElement.className = `token ${token.type}`;
                tokenElement.draggable = true;
                tokenElement.title = token.name;
                
                // Si hay imagen, establecerla como fondo
                if (token.image) {
                    tokenElement.style.backgroundImage = `url(${token.image})`;
                    tokenElement.textContent = ''; // No mostrar letra
                } else {
                    // Mostrar la primera letra del nombre
                    tokenElement.textContent = token.name.charAt(0).toUpperCase();
                    // Establecer gradiente según el tipo
                    if (token.type === 'player') {
                        tokenElement.style.background = 'radial-gradient(circle, #3498db, #1a5a8a)';
                    } else if (token.type === 'enemy') {
                        tokenElement.style.background = 'radial-gradient(circle, #e74c3c, #8b2118)';
                    } else if (token.type === 'object') {
                        tokenElement.style.background = 'radial-gradient(circle, #f1c40f, #f39c12)';
                    } else {
                        tokenElement.style.background = 'radial-gradient(circle, #2ecc71, #1a6b41)';
                    }
                }
                
                // Agregar elementos de información (solo visibles al pasar el cursor)
                tokenElement.innerHTML += `
                    <div class="token-info">${token.name}</div>
                `;
                
                // Mostrar HP solo para personajes (no objetos)
                if (token.type !== 'object') {
                    tokenElement.innerHTML += `
                        <div class="token-hp">❤️ ${token.hp}</div>
                    `;
                }
                
                // Añadir indicador de usuario
                if (token.userId && gameState.users[token.userId]) {
                    tokenElement.innerHTML += `
                        <div class="user-indicator" style="background-color: ${gameState.users[token.userId].color}"></div>
                    `;
                }
                
                // Eventos de arrastre
                tokenElement.addEventListener('dragstart', handleDragStart);
                
                // Evento para editar la ficha o mostrar descripción
                tokenElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (token.type === 'object') {
                        showObjectDescription(token);
                    } else {
                        openEditForm(token);
                    }
                });
                
                cell.appendChild(tokenElement);
            }
            
            // Mostrar descripción de objeto
            function showObjectDescription(token) {
                gameState.currentObject = token;
                objectDescription.textContent = token.description || "Este objeto no tiene descripción.";
                objectModal.style.display = 'block';
                overlay.style.display = 'block';
            }
            
            // Editar objeto desde el modal
            function editObjectFromModal() {
                if (gameState.currentObject) {
                    openEditForm(gameState.currentObject);
                    closeObjectModalFunc();
                }
            }
            
            function closeObjectModalFunc() {
                objectModal.style.display = 'none';
                overlay.style.display = 'none';
            }
            
            // Eliminar objeto desde el modal
            function deleteObjectFromModal() {
                if (gameState.currentObject) {
                    if (confirm(`¿Estás seguro de eliminar el objeto "${gameState.currentObject.name}"?`)) {
                        socket.emit('delete-token', gameState.currentObject.id);
                        closeObjectModalFunc();
                    }
                }
            }
            
            // Manejar inicio de arrastre
            function handleDragStart(e) {
                const tokenId = e.target.id;
                e.dataTransfer.setData('text/plain', tokenId);
            }
            
            // Manejar arrastre sobre una celda
            function handleDragOver(e) {
                e.preventDefault();
            }
            
            // Manejar soltar en una celda
            function handleDrop(e) {
                e.preventDefault();
                const tokenId = e.dataTransfer.getData('text/plain');
                const token = gameState.tokens.find(t => t.id === tokenId);
                
                if (token) {
                    const row = parseInt(e.target.dataset.row);
                    const col = parseInt(e.target.dataset.col);
                    
                    // Actualizar posición del token
                    token.row = row;
                    token.col = col;
                    
                    // Enviar actualización al servidor
                    socket.emit('update-token', token);
                    
                    // Volver a renderizar
                    renderToken(token);
                }
            }
            
            // Abrir formulario de edición
            function openEditForm(token) {
                gameState.editingToken = token;
                editNameInput.value = token.name;
                
                // Mostrar u ocultar campos según el tipo
                if (token.type === 'object') {
                    editHpContainer.style.display = 'none';
                    editDescContainer.style.display = 'block';
                    editDescInput.value = token.description || "";
                } else {
                    editHpContainer.style.display = 'block';
                    editDescContainer.style.display = 'none';
                    editHPInput.value = token.hp;
                }
                
                tokenEditForm.style.display = 'block';
                overlay.style.display = 'block';
            }
            
            // Cerrar formulario de edición
            function closeEditForm() {
                tokenEditForm.style.display = 'none';
                overlay.style.display = 'none';
                gameState.editingToken = null;
            }
            
            // Guardar cambios en la ficha
            function saveTokenChanges() {
                if (!gameState.editingToken) return;
                
                const newName = editNameInput.value.trim();
                const newHp = parseInt(editHPInput.value);
                const newDesc = editDescInput.value.trim();
                
                if (newName) {
                    gameState.editingToken.name = newName;
                    
                    if (gameState.editingToken.type === 'object') {
                        gameState.editingToken.description = newDesc;
                    } else if (!isNaN(newHp)) {
                        gameState.editingToken.hp = newHp;
                    }
                    
                    // Enviar actualización al servidor
                    socket.emit('update-token', gameState.editingToken);
                    
                    renderToken(gameState.editingToken);
                    closeEditForm();
                } else {
                    alert('Por favor ingresa un nombre válido.');
                }
            }
            
            // Eliminar ficha
            function deleteToken() {
                if (!gameState.editingToken) return;
                
                if (confirm(`¿Estás seguro de eliminar la ficha "${gameState.editingToken.name}"?`)) {
                    socket.emit('delete-token', gameState.editingToken.id);
                    closeEditForm();
                }
            }
            
            // Lanzar dados
            function rollDice(numDice) {
                const rolls = [];
                let total = 0;
                
                for (let i = 0; i < numDice; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    rolls.push(roll);
                    total += roll;
                }
                
                const rollData = {
                    rolls,
                    total,
                    timestamp: new Date().toLocaleTimeString(),
                    player: gameState.userName
                };
                
                // Enviar al servidor
                socket.emit('roll-dice', rollData);
            }
            
            // Actualizar UI de dados
            function updateDiceUI() {
                if (gameState.currentRoll) {
                    let diceHtml = '';
                    
                    // Mostrar cada dado individualmente
                    gameState.currentRoll.rolls.forEach((roll, index) => {
                        diceHtml += `<span class="dice-animation dice-value">${roll}</span>`;
                        if (index < gameState.currentRoll.rolls.length - 1) {
                            diceHtml += '<span>+</span>';
                        }
                    });
                    
                    // Mostrar el total si hay más de un dado
                    if (gameState.currentRoll.rolls.length > 1) {
                        diceHtml += `<span>=</span><span class="dice-total">${gameState.currentRoll.total}</span>`;
                    }
                    
                    currentRollElement.innerHTML = diceHtml;
                }
                
                // Actualizar historial
                diceHistoryElement.innerHTML = '';
                gameState.diceHistory.slice().reverse().forEach(roll => {
                    const rollElement = document.createElement('div');
                    let rollText = roll.rolls.join(' + ');
                    if (roll.rolls.length > 1) {
                        rollText += ` = ${roll.total}`;
                    }
                    rollElement.textContent = `${roll.player} - ${roll.timestamp}: ${rollText}`;
                    diceHistoryElement.appendChild(rollElement);
                });
            }
            
            // Guardar partida
            function saveGame() {
                const stateToSave = {
                    tokens: gameState.tokens,
                    diceHistory: gameState.diceHistory,
                    boardBackground: gameState.boardBackground,
                    rows: gameState.rows,
                    cols: gameState.cols,
                    cellOpacity: gameState.cellOpacity
                };
                
                const dataStr = JSON.stringify(stateToSave, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileName = `rpg_game_${new Date().toISOString().slice(0, 10)}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileName);
                linkElement.click();
            }
            
            // Cargar partida
            function loadGame() {
                gameFileInput.click();
            }
            
            // Manejar selección de archivo para cargar
            gameFileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const loadedState = JSON.parse(e.target.result);
                        
                        // Restaurar estado
                        gameState.tokens = loadedState.tokens || [];
                        gameState.diceHistory = loadedState.diceHistory || [];
                        gameState.currentRoll = gameState.diceHistory.length > 0 ? 
                            gameState.diceHistory[gameState.diceHistory.length - 1] : null;
                        gameState.boardBackground = loadedState.boardBackground || null;
                        gameState.rows = loadedState.rows || 15;
                        gameState.cols = loadedState.cols || 15;
                        gameState.cellOpacity = loadedState.cellOpacity || 0.7;
                        
                        // Sincronizar con el servidor
                        socket.emit('sync-game-state', {
                            tokens: gameState.tokens,
                            diceHistory: gameState.diceHistory,
                            boardBackground: gameState.boardBackground,
                            rows: gameState.rows,
                            cols: gameState.cols,
                            cellOpacity: gameState.cellOpacity
                        });
                        
                        alert('Partida cargada con éxito!');
                    } catch (error) {
                        alert('Error al cargar el archivo: ' + error.message);
                    }
                };
                reader.readAsText(file);
            });
            
            // Cargar imagen de mapa
            loadMapBtn.addEventListener('click', function() {
                const file = mapImageInput.files[0];
                if (!file) {
                    alert('Por favor selecciona un archivo de imagen primero.');
                    return;
                }
                
                // Obtener dimensiones
                gameState.rows = parseInt(rowsInput.value) || 15;
                gameState.cols = parseInt(colsInput.value) || 15;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    gameState.boardBackground = e.target.result;
                    
                    // Sincronizar con el servidor
                    socket.emit('sync-game-state', {
                        tokens: gameState.tokens,
                        diceHistory: gameState.diceHistory,
                        boardBackground: gameState.boardBackground,
                        rows: gameState.rows,
                        cols: gameState.cols,
                        cellOpacity: gameState.cellOpacity
                    });
                    
                    alert('Mapa cargado con éxito!');
                };
                reader.readAsDataURL(file);
            });
            
            // Control de transparencia
            cellOpacityInput.addEventListener('input', function() {
                const value = parseInt(this.value);
                opacityValue.textContent = `${value}%`;
                gameState.cellOpacity = value / 100;
                
                // Aplicar transparencia a todas las celdas
                document.querySelectorAll('.cell').forEach(cell => {
                    cell.style.backgroundColor = `rgba(52, 73, 94, ${gameState.cellOpacity})`;
                });
                
                // Sincronizar con el servidor
                socket.emit('sync-game-state', {
                    tokens: gameState.tokens,
                    diceHistory: gameState.diceHistory,
                    boardBackground: gameState.boardBackground,
                    rows: gameState.rows,
                    cols: gameState.cols,
                    cellOpacity: gameState.cellOpacity
                });
            });
            
            // Cambiar formulario según tipo de ficha
            charTypeSelect.addEventListener('change', function() {
                if (this.value === 'object') {
                    hpContainer.style.display = 'none';
                    descContainer.style.display = 'block';
                } else {
                    hpContainer.style.display = 'block';
                    descContainer.style.display = 'none';
                }
            });
            
            // Sistema de usuarios online
            function updateOnlineUsers() {
                onlineUsers.innerHTML = '';
                let userCount = 0;
                
                for (const userId in gameState.users) {
                    const user = gameState.users[userId];
                    const userElement = document.createElement('div');
                    userElement.className = 'user-badge';
                    userElement.style.backgroundColor = user.color;
                    userElement.textContent = user.name.charAt(0);
                    userElement.dataset.name = user.name;
                    
                    onlineUsers.appendChild(userElement);
                    userCount++;
                }
                
                onlineStatus.textContent = `Online: ${userCount}`;
                statusIndicator.classList.add('online');
                
                // Actualizar gestión de jugadores
                updatePlayerManagement();
            }
            
            function updatePlayerManagement() {
                if (gameState.currentUser && gameState.currentUser.id === gameState.leaderId) {
                    playerManagement.style.display = 'block';
                    renderPlayerList();
                } else {
                    playerManagement.style.display = 'none';
                }
            }
            
            function renderPlayerList() {
                playerList.innerHTML = '';
                
                for (const userId in gameState.users) {
                    if (userId === gameState.leaderId) continue; // No mostrar al líder
                    
                    const user = gameState.users[userId];
                    const playerItem = document.createElement('div');
                    playerItem.className = 'player-item';
                    playerItem.innerHTML = `
                        <span>${user.name}</span>
                        <button class="kick-btn" data-userid="${userId}">Expulsar</button>
                    `;
                    playerList.appendChild(playerItem);
                }
                
                // Eventos de expulsión
                document.querySelectorAll('.kick-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const userId = this.dataset.userid;
                        kickPlayer(userId);
                    });
                });
            }
            
            function kickPlayer(userId) {
                if (gameState.currentUser.id !== gameState.leaderId) return;
                
                if (confirm(`¿Expulsar a ${gameState.users[userId].name}?`)) {
                    socket.emit('kick-player', userId);
                }
            }
            
            function showNotification(message) {
                notificationText.textContent = message;
                onlineNotification.style.display = 'block';
                
                setTimeout(() => {
                    onlineNotification.style.display = 'none';
                }, 3000);
            }
            
            // Generar ID de juego
            function generateGameId() {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let id = '';
                for (let i = 0; i < 6; i++) {
                    id += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return id;
            }
            
            // Generar color aleatorio
            function getRandomColor() {
                const colors = [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#8AC926', '#1982C4',
                    '#6A4C93', '#F15BB5', '#00BBF9', '#00F5D4'
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }
            
            // Copiar ID de partida
            copyGameIdBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(gameState.gameId).then(() => {
                    const originalText = copyGameIdBtn.innerHTML;
                    copyGameIdBtn.innerHTML = '<i class="fas fa-check"></i>';
                    
                    setTimeout(() => {
                        copyGameIdBtn.innerHTML = originalText;
                    }, 2000);
                });
            });
            
            // Abrir modal para unirse a partida
            joinGameBtn.addEventListener('click', function() {
                joinModal.style.display = 'block';
                overlay.style.display = 'block';
                gameIdInput.focus();
            });
            
            // Cerrar modal de unión
            cancelJoin.addEventListener('click', function() {
                joinModal.style.display = 'none';
                overlay.style.display = 'none';
            });
            
            // Unirse a una partida
            function joinGame(gameId) {
                socket.connect();
                socket.emit('join-session', gameId, {
                    id: socket.id,
                    name: gameState.userName,
                    color: gameState.userColor
                });
                
                gameState.gameId = gameId;
                gameState.isHost = false;
                gameIdDisplay.textContent = `ID: ${gameState.gameId}`;
            }
            
            joinGameAction.addEventListener('click', function() {
                const gameId = gameIdInput.value.trim().toUpperCase();
                if (gameId.length !== 6) {
                    alert('El ID de partida debe tener 6 caracteres');
                    return;
                }
                
                joinGame(gameId);
                joinModal.style.display = 'none';
                overlay.style.display = 'none';
            });
            
            // Event Listeners
            rollSingleBtn.addEventListener('click', () => rollDice(1));
            rollDoubleBtn.addEventListener('click', () => rollDice(2));
            rollTripleBtn.addEventListener('click', () => rollDice(3));
            clearHistoryBtn.addEventListener('click', () => {
                gameState.diceHistory = [];
                gameState.currentRoll = null;
                currentRollElement.textContent = '-';
                diceHistoryElement.innerHTML = '';
                
                // Sincronizar con el servidor
                socket.emit('sync-game-state', {
                    tokens: gameState.tokens,
                    diceHistory: gameState.diceHistory,
                    boardBackground: gameState.boardBackground,
                    rows: gameState.rows,
                    cols: gameState.cols,
                    cellOpacity: gameState.cellOpacity
                });
            });
            saveGameBtn.addEventListener('click', saveGame);
            loadGameBtn.addEventListener('click', loadGame);
            saveTokenChangesBtn.addEventListener('click', saveTokenChanges);
            deleteTokenBtn.addEventListener('click', deleteToken);
            closeEditFormBtn.addEventListener('click', closeEditForm);
            overlay.addEventListener('click', closeEditForm);
            closeObjectModal.addEventListener('click', closeObjectModalFunc);
            editObjectBtn.addEventListener('click', editObjectFromModal);
            deleteObjectBtn.addEventListener('click', deleteObjectFromModal);
            
            // Añadir token desde formulario
            addTokenBtn.addEventListener('click', () => {
                const name = document.getElementById('charName').value.trim();
                const type = document.getElementById('charType').value;
                const hp = type === 'object' ? 0 : parseInt(document.getElementById('charHP').value);
                const description = type === 'object' ? charDescInput.value.trim() : "";
                const imageFile = charImageInput.files[0];
                
                if (!name) {
                    alert('Por favor ingresa un nombre para la ficha.');
                    return;
                }
                
                if (type !== 'object' && (isNaN(hp) || hp <= 0)) {
                    alert('Por favor ingresa un valor válido para los puntos de vida.');
                    return;
                }
                
                if (type === 'object' && !description) {
                    alert('Por favor ingresa una descripción para el objeto.');
                    return;
                }
                
                // Leer imagen si se proporcionó
                let imageData = null;
                if (imageFile) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imageData = e.target.result;
                        addTokenToBoard(name, type, hp, imageData, description);
                    };
                    reader.readAsDataURL(imageFile);
                } else {
                    addTokenToBoard(name, type, hp, null, description);
                }
            });
            
            function addTokenToBoard(name, type, hp, imageData, description) {
                // Crear token en una posición aleatoria
                const emptyCells = Array.from(document.querySelectorAll('.cell'))
                    .filter(cell => !cell.querySelector('.token'));
                
                if (emptyCells.length === 0) {
                    alert('No hay espacio disponible en el tablero!');
                    return;
                }
                
                const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                const row = parseInt(randomCell.dataset.row);
                const col = parseInt(randomCell.dataset.col);
                
                createToken(name, type, hp, imageData, description, row, col);
                
                // Resetear formulario
                document.getElementById('charName').value = '';
                document.getElementById('charHP').value = '20';
                charDescInput.value = '';
                charImageInput.value = ''; // Limpiar input de imagen
                
                // Restaurar vista por defecto
                hpContainer.style.display = 'block';
                descContainer.style.display = 'none';
                charTypeSelect.value = 'player';
            }
            
            // Permitir arrastrar tokens de muestra
            document.querySelectorAll('.sample-token').forEach(token => {
                token.addEventListener('dragstart', function(e) {
                    const type = this.dataset.type;
                    e.dataTransfer.setData('text/plain', type);
                });
            });
            
            // Permitir soltar tokens de muestra en el tablero
            document.querySelectorAll('.cell').forEach(cell => {
                cell.addEventListener('drop', function(e) {
                    e.preventDefault();
                    const type = e.dataTransfer.getData('text/plain');
                    
                    if (['player', 'enemy', 'npc', 'object'].includes(type)) {
                        const name = prompt(`Nombre para el ${type === 'player' ? 'jugador' : type === 'enemy' ? 'enemigo' : type === 'object' ? 'objeto' : 'NPC'}:`, 
                            type === 'player' ? 'Jugador' : type === 'enemy' ? 'Enemigo' : type === 'object' ? 'Objeto' : 'NPC');
                        
                        if (name) {
                            let hp = 0;
                            let description = "";
                            
                            if (type !== 'object') {
                                hp = parseInt(prompt('Puntos de vida:', '20') || '20');
                            } else {
                                description = prompt('Descripción del objeto:', '') || "";
                            }
                            
                            const row = parseInt(this.dataset.row);
                            const col = parseInt(this.dataset.col);
                            
                            // Preguntar por imagen
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        createToken(name, type, hp, e.target.result, description, row, col);
                                    };
                                    reader.readAsDataURL(file);
                                } else {
                                    createToken(name, type, hp, null, description, row, col);
                                }
                            };
                            input.click();
                        }
                    }
                });
            });
            
            // Inicializar la aplicación
            initBoard();
            
            // Generar ID de partida para el líder
            gameState.gameId = generateGameId();
            gameIdDisplay.textContent = `ID: ${gameState.gameId}`;
            
            // Conectar como líder
            gameState.isHost = true;
            socket.connect();
            
            // Registrar usuario actual después de conectarse
            socket.on('connect', () => {
                // Solo crear el usuario si no existe
                if (!gameState.currentUser) {
                    gameState.currentUser = {
                        id: socket.id,
                        name: gameState.userName,
                        color: gameState.userColor
                    };
                    gameState.users[socket.id] = gameState.currentUser;
                    gameState.leaderId = socket.id;
                    updateOnlineUsers();
                }
            });
        });
    </script>
</body>
</html>