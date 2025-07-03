const express = require('express');
const path = require('path');
const app = express();

// Sirve archivos estáticos desde 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});