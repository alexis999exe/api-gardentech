const mongoose = require('mongoose');

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

module.exports = mongoose.model('Usuario', userSchema);
