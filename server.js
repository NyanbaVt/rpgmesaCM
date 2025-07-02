const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Almacenar sesiones
const sessions = {};

io.on('connection', (socket) => {
  // Implementar lógica de Socket.IO aquí:
  // - Gestión de sesiones
  // - Sincronización de estado del juego
  // - Comunicación en tiempo real
  // (Usa la lógica de eventos que ya tienes en tu cliente)
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});