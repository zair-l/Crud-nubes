import express, { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

const rootDir = __dirname.endsWith('dist') ? path.join(__dirname, '..') : __dirname;

app.use(express.static(rootDir));

let db: Database;

async function initDB() {
    db = await open({
        filename: path.join(rootDir, 'usuarios.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
        )
    `);
    console.log(' Base de datos SQLite lista.');
}

// --- RUTAS DE LA API ---

// Obtener todos los usuarios
app.get('/usuarios', async (req: Request, res: Response) => {
    try {
        const usuarios = await db.all('SELECT * FROM usuarios');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Crear un usuario
app.post('/usuarios', async (req: Request, res: Response) => {
    try {
        const { nombre, email } = req.body;
        const result = await db.run('INSERT INTO usuarios (nombre, email) VALUES (?, ?)', [nombre, email]);
        res.status(201).json({ id: result.lastID, nombre, email });
    } catch (error: any) {
        res.status(400).json({ error: 'El email ya existe o faltan datos.' });
    }
});

// Actualizar un usuario (Ruta PUT corregida)
app.put('/usuarios/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, email } = req.body;
    try {
        const result = await db.run(
            'UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?',
            [nombre, email, id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar (posible email duplicado)' });
    }
});

// Eliminar un usuario
app.delete('/usuarios/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(rootDir, 'index.html'));
});

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
    });
});