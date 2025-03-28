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


// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en http://10.198.56.151:3000/api/login`);
});
