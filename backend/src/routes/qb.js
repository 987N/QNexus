const db = require('../db/db');

async function qbRoutes(fastify, options) {
  // GET /api/qb-containers
  fastify.get('/api/qb-containers', async (request, reply) => {
    const stmt = db.prepare('SELECT id, name, host, port, username, created_at FROM qb_containers');
    const containers = stmt.all();
    return containers;
  });

  // POST /api/qb-containers
  fastify.post('/api/qb-containers', async (request, reply) => {
    const { name, host, port, username, password } = request.body;
    
    if (!name || !host || !port || !username || !password) {
      reply.code(400).send({ error: 'Missing required fields' });
      return;
    }

    const stmt = db.prepare('INSERT INTO qb_containers (name, host, port, username, password) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(name, host, port, username, password);
    
    return { id: info.lastInsertRowid, name, host, port, username };
  });

  // PUT /api/qb-containers/:id
  fastify.put('/api/qb-containers/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, host, port, username, password } = request.body;
    
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (host) { updates.push('host = ?'); values.push(host); }
    if (port) { updates.push('port = ?'); values.push(port); }
    if (username) { updates.push('username = ?'); values.push(username); }
    if (password) { updates.push('password = ?'); values.push(password); }
    
    if (updates.length === 0) {
      return { message: 'No changes' };
    }
    
    values.push(id);
    const stmt = db.prepare(`UPDATE qb_containers SET ${updates.join(', ')} WHERE id = ?`);
    const info = stmt.run(...values);
    
    if (info.changes === 0) {
      reply.code(404).send({ error: 'Container not found' });
      return;
    }
    
    return { message: 'Updated successfully' };
  });

  // DELETE /api/qb-containers/:id
  fastify.delete('/api/qb-containers/:id', async (request, reply) => {
    const { id } = request.params;
    const stmt = db.prepare('DELETE FROM qb_containers WHERE id = ?');
    const info = stmt.run(id);
    
    if (info.changes === 0) {
      reply.code(404).send({ error: 'Container not found' });
      return;
    }
    
    return { message: 'Deleted successfully' };
  });
}

module.exports = qbRoutes;
