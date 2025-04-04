const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Configuración de CORS
app.use(cors());

// Middleware para procesar las solicitudes JSON
app.use(express.json());

// Conexión a MongoDB
mongoose.connect('mongodb+srv://alexis:susa2018@cluster0.owzoh.mongodb.net/dbGardenTech', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Conexión a MongoDB exitosa');
})
.catch((error) => {
  console.error('Error al conectar MongoDB', error);
});

// Definir el esquema de usuario
const userSchema = new mongoose.Schema({
  nombre: String,
  apellido_p: String,
  apellido_m: String,
  correo: { type: String, unique: true },
  telefono: String,
  contrasena: String, 
  planta: {
    nombre: String,
    descripcion: String,
  }
});

const User = mongoose.model('Usuario', userSchema);

// Ruta de registro (con encriptación)
app.post('/api/register', async (req, res) => {
  const { nombre, apellido_p, apellido_m, correo, telefono, contrasena, planta } = req.body;

  try {
    const newUser = new User({ 
      nombre, 
      apellido_p, 
      apellido_m, 
      correo, 
      telefono, 
      contrasena, 
      planta 
    });
    await newUser.save();
    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    res.status(400).json({ error: 'Error al registrar el usuario' });
  }
});

// Ruta de inicio de sesión (sin encriptación de contraseña)
app.post('/api/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    const user = await User.findOne({ correo });
    if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

    // Comparar la contraseña directamente
    if (contrasena !== user.contrasena) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user._id }, 'tu_clave_secreta', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para obtener los datos del usuario
app.get('/api/get-user-data', async (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: 'No se proporcionó token' });
  }

  try {
    const decoded = jwt.verify(token, 'tu_clave_secreta'); // Verifica el token
    const user = await User.findById(decoded.id).select('-contrasena'); // Excluye la contraseña

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para editar el perfil del usuario
app.put('/api/edit-profile', async (req, res) => {
  const token = req.headers['authorization'];
  const { nombre, apellido_p, apellido_m, correo, telefono, planta } = req.body;

  if (!token) {
    return res.status(403).json({ error: 'No se proporcionó token' });
  }

  try {
    const decoded = jwt.verify(token, 'tu_clave_secreta'); // Verifica el token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualiza los datos del usuario
    user.nombre = nombre || user.nombre;
    user.apellido_p = apellido_p || user.apellido_p;
    user.apellido_m = apellido_m || user.apellido_m;
    user.correo = correo || user.correo;
    user.telefono = telefono || user.telefono;
    user.planta = planta || user.planta;

    await user.save();
    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Definir el esquema del sensor
const Sensor = mongoose.model('Sensor', new mongoose.Schema({
  tipo_sensor: String,
  valor: Number,
  fecha_monitoreo: Date
}));

// Ruta para obtener los últimos valores de cada sensor
app.get('/ultimos-valores', async (req, res) => {
  try {
    const temperatura = await Sensor.findOne({ tipo_sensor: "Temperatura" }).sort({ fecha_monitoreo: -1 });
    const humedadTierra = await Sensor.findOne({ tipo_sensor: "Humedad Tierra" }).sort({ fecha_monitoreo: -1 });
    const nivelAgua = await Sensor.findOne({ tipo_sensor: "Nivel de Agua" }).sort({ fecha_monitoreo: -1 });

    // Mostrar los resultados en consola para depuración
    console.log({ temperatura, humedadTierra, nivelAgua });

    // Devolver la respuesta con los valores más recientes
    res.json({
      Temperatura: temperatura ? temperatura.valor : null,
      "Humedad Tierra": humedadTierra ? humedadTierra.valor : null,
      "Nivel de Agua": nivelAgua ? nivelAgua.valor : null
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).send("Error en la consulta de los sensores.");
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`https://api-gardentech.onrender.com`);
});
