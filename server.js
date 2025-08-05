const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Track users by room
const roomUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (data) => {
    const { username, room } = data;
    
    // Join the room
    socket.join(room);
    
    // Initialize room if not exists
    if (!roomUsers[room]) {
      roomUsers[room] = [];
    }
    
    // Add user to room
    roomUsers[room].push({ id: socket.id, username });
    
    // Update all users in room
    updateUserList(room);
  });

  socket.on('send_message', (data) => {
    // Broadcast to others in room
    socket.to(data.room).emit('receive_message', {
      ...data,
      status: 'delivered'
    });
    
    // Confirm to sender
    socket.emit('receive_message', {
      ...data,
      status: 'sent'
    });
  });

  socket.on('disconnect', () => {
    // Find and remove user from all rooms
    for (const room in roomUsers) {
      const index = roomUsers[room].findIndex(user => user.id === socket.id);
      if (index !== -1) {
        roomUsers[room].splice(index, 1);
        updateUserList(room);
        break;
      }
    }
  });

  function updateUserList(room) {
    const users = roomUsers[room].map(user => user.username);
    io.to(room).emit('update_users', users);
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});