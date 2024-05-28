const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:3030", // Your React frontend URL
    methods: ["GET", "POST"]
  }
});
const mongoose = require('mongoose');
const Tesseract = require('tesseract.js');
const cors = require('cors');

// Enable CORS
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const Mongo_db = "mongodb+srv://hazem:1234@cluster0.7enpft6.mongodb.net/ChatApp";

mongoose.connect(Mongo_db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((conn) => {
        console.log(`Database connected: ${conn.connection.host}`);
    }).catch((err) => {
        console.error('Database connection error:', err);
    });

const MessagesSchema = new mongoose.Schema({
    Author: String,
    Content: String,
    image: String
}, { collection: 'Messages' }); // Specify collection name

const Messages = mongoose.model('Messages', MessagesSchema);

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('username', (username) => {
        console.log("The logged username is " + username);
        socket.username = username;
        io.emit("userJoined", username);
    });

    socket.on('chat message', async (msg) => {
        console.log('Received chat message:', msg);
        if (msg.image) {
            try {
                const result = await Tesseract.recognize(
                    msg.image,
                    'eng',
                    { logger: m => console.log(m) }
                );
                msg.Content = result.data.text.trim();
            } catch (error) {
                console.error('Error extracting text from image:', error);
            }
        }

        // Create a new document instance each time
        const messageData = {
            Author: msg.Author,
            Content: msg.Content,
            image: msg.image
        };

        try {
            const message = new Messages(messageData);
            await message.save();
            console.log('Message saved to database:', message);
            io.emit("chat message", msg);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        io.emit("user left", socket.username);
    });
});

app.get('/test-save', async (req, res) => {
    const testMessage = new Messages({
        Author: 'Test Author',
        Content: 'This is a test message',
        image: ''
    });

    try {
        await testMessage.save();
        res.send('Test message saved to database');
    } catch (err) {
        console.error('Error saving test message:', err);
        res.status(500).send('Error saving test message');
    }
});

app.use(express.static('public'));

http.listen(5000, () => {
    console.log('Listening on *:5000');
});
