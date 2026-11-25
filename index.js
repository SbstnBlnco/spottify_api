const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Interfaz web (estilo Spotify)
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://root:root@cluster0.vcrqhkl.mongodb.net/spotify';

// Cache de conexión para Vercel (Serverless)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function conectarDB() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Middleware: garantiza conexión activa en cada petición antes de tocar la BD
app.use(async (req, res, next) => {
  try {
    await conectarDB();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error de conexión a MongoDB', detalle: error.message });
  }
});

// Esquemas y modelos
const artistaSchema = new mongoose.Schema({
  nombre: String,
  pais: String,
  añoFormacion: Number,
  generoMusical: String,
  integrantes: Number,
  reproduccionesMensuales: Number,
  urlFoto: String,
});

const Artista = mongoose.model('Artista', artistaSchema, 'artistas');

const cancionSchema = new mongoose.Schema({
  titulo: String,
  artista_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artista' },
  album: String,
  duracion: Number,
  reproducciones: Number,
  añoLanzamiento: Number,
  urlFotoAlbum: String,
});

const Cancion = mongoose.model('Cancion', cancionSchema, 'canciones');

// Rutas
app.get('/estado', (req, res) => {
  res.send('API Spotify funcionando');
});

app.post('/artistas', async (req, res) => {
  try {
    const nuevoArtista = new Artista(req.body);
    const guardado = await nuevoArtista.save();
    res.status(201).json(guardado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/artistas', async (req, res) => {
  try {
    const artistas = await Artista.find();
    res.json(artistas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/canciones', async (req, res) => {
  try {
    const nuevaCancion = new Cancion(req.body);
    const guardada = await nuevaCancion.save();
    res.status(201).json(guardada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/canciones', async (req, res) => {
  try {
    const canciones = await Cancion.find().populate('artista_id');
    res.json(canciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/artistas/:id', async (req, res) => {
  try {
    const eliminado = await Artista.findByIdAndDelete(req.params.id);

    if (!eliminado) {
      return res.status(404).json({ mensaje: 'Artista no encontrado' });
    }

    res.status(200).json({
      mensaje: 'Artista eliminado exitosamente',
      artista: eliminado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/canciones/:id', async (req, res) => {
  try {
    const eliminada = await Cancion.findByIdAndDelete(req.params.id);

    if (!eliminada) {
      return res.status(404).json({ mensaje: 'Canción no encontrada' });
    }

    res.status(200).json({
      mensaje: 'Canción eliminada exitosamente',
      cancion: eliminada
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;