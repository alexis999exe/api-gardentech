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
    
    // Asegurar que planta existe y tiene las propiedades necesarias
    const userData = {
      nombre: user.nombre || '',
      apellido_p: user.apellido_p || '',
      apellido_m: user.apellido_m || '',
      correo: user.correo || '',
      telefono: user.telefono || '',
      planta: {
        nombre: user.planta && user.planta.nombre ? user.planta.nombre : '',
        descripcion: user.planta && user.planta.descripcion ? user.planta.descripcion : '',
      }
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para editar el perfil del usuario
app.put('/api/edit-profile', async (req, res) => {
  const token = req.headers['authorization'];
  const { nombre, apellido_p, apellido_m, correo, telefono, contrasena, planta } = req.body;
  
  if (!token) {
    return res.status(403).json({ error: 'No se proporcionó token' });
  }
  
  try {
    const decoded = jwt.verify(token, 'tu_clave_secreta'); // Verifica el token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Actualiza solo los campos que se enviaron
    if (nombre !== undefined) user.nombre = nombre;
    if (apellido_p !== undefined) user.apellido_p = apellido_p;
    if (apellido_m !== undefined) user.apellido_m = apellido_m;
    if (correo !== undefined) user.correo = correo;
    if (telefono !== undefined) user.telefono = telefono;
    
    // Solo actualiza la contraseña si se proporcionó una nueva
    if (contrasena && contrasena.trim() !== '') {
      user.contrasena = contrasena;
    }
    
    // Actualiza la información de la planta
    if (planta) {
      // Si no existe el objeto planta, lo creamos
      if (!user.planta) {
        user.planta = {};
      }
      
      if (planta.nombre !== undefined) user.planta.nombre = planta.nombre;
      if (planta.descripcion !== undefined) user.planta.descripcion = planta.descripcion;
    }
    
    await user.save();
    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para obtener el último dato de temperatura
app.get('/api/last-temperature', async (req, res) => {
  try {
    const lastTemperature = await mongoose.connection.collection('sensores')
      .find({ tipo_sensor: 'Temperatura' })
      .sort({ fecha_monitoreo: -1 })
      .limit(1)
      .toArray();
    
    if (lastTemperature && lastTemperature.length > 0) {
      res.json(lastTemperature[0]);
    } else {
      res.status(404).json({ error: 'No se encontraron datos de temperatura' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para obtener el último dato de humedad
app.get('/api/last-humidity', async (req, res) => {
  try {
    const lastHumidity = await mongoose.connection.collection('sensores')
      .find({ tipo_sensor: { $in: ['Humedad Tierra', 'Humedad'] } })
      .sort({ fecha_monitoreo: -1 })
      .limit(1)
      .toArray();
    
    if (lastHumidity && lastHumidity.length > 0) {
      res.json(lastHumidity[0]);
    } else {
      res.status(404).json({ error: 'No se encontraron datos de humedad' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para obtener el último dato de nivel de agua
app.get('/api/last-water-level', async (req, res) => {
  try {
    const lastWaterLevel = await mongoose.connection.collection('sensores')
      .find({ tipo_sensor: 'Nivel de Agua' })
      .sort({ fecha_monitoreo: -1 })
      .limit(1)
      .toArray();
    
    if (lastWaterLevel && lastWaterLevel.length > 0) {
      res.json(lastWaterLevel[0]);
    } else {
      res.status(404).json({ error: 'No se encontraron datos de nivel de agua' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

///////////

// Ruta para recibir datos de sensores desde ESP32
app.post('/api/sensor-data', async (req, res) => {
  try {
    const { tipo_sensor, valor, fecha_monitoreo } = req.body;
    
    // Validar que todos los campos necesarios estén presentes
    if (!tipo_sensor || valor === undefined || !fecha_monitoreo) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    // Crear un documento con el formato correcto
    const sensorData = {
      tipo_sensor,
      valor,
      fecha_monitoreo: new Date(fecha_monitoreo)
    };
    
    // Insertar en la colección sensores
    await mongoose.connection.collection('sensores').insertOne(sensorData);
    
    res.status(201).json({ message: 'Datos del sensor guardados correctamente' });
  } catch (error) {
    console.error('Error al guardar datos del sensor:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


// Ruta para activar paro de emergencia
app.post('/api/emergency-stop', (req, res) => {
  // Aquí podrías guardar en la base de datos si lo deseas
  // O simplemente responder al ESP32 si hace polling a esta info
  console.log('🚨 Paro de emergencia activado');

  // Podrías guardar en MongoDB si necesitas historiales
  // o enviar una señal a otro sistema, etc.

  res.json({ message: 'Paro de emergencia activado correctamente' });
});


// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`https://api-gardentech.onrender.com`);
});
