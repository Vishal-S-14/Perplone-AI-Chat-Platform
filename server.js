const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/perplone';

// Middleware
// Restrict CORS to prevent unauthorized access
app.use(cors({
  origin: "http://localhost:3000"
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB database: perplone'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema for Credentials
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: true,
    minlength: [8, 'Password must be at least 8 characters'],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Adding lastSeen to match admin.html's old functionality
  lastSeen: {
    type: Date,
    default: Date.now
  }
});

// Index for unique email
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema, 'users');

// Chat History Schema
const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  messages: [{
    text: { type: String, required: true },
    type: { type: String, enum: ['user-msg', 'ai-msg', 'error-msg'], required: true },
  }],
  pinned: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Index for userId + createdAt
chatSchema.index({ userId: 1, createdAt: -1 });

const Chat = mongoose.model('Chat', chatSchema, 'chat_history');

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied, no token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user; // user payload is { userId, email, username, role }
    next();
  });
};

// Token Validation Endpoint
app.get('/api/validate-token', authenticateToken, (req, res) => {
  res.json({ email: req.user.email, username: req.user.username, role: req.user.role });
});

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' } // Increased expiry
    );

    res.status(201).json({ token, email: user.email, username: user.username, role: user.role });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Signin Endpoint (by email OR username)
app.post('/api/signin', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const user = await User.findOne(email ? { email } : { username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    // Update lastSeen on login
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' } // Increased expiry
    );

    res.json({ token, email: user.email, username: user.username, role: user.role });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Server error during signin' });
  }
});

// Get Chat History
app.get('/api/chat-history', authenticateToken, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Server error fetching chat history' });
  }
});

// Save Chat History
app.post('/api/chat-history', authenticateToken, async (req, res) => {
  try {
    const { chatHistory } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(chatHistory)) {
      return res.status(400).json({ error: 'Chat history must be an array' });
    }

    // This is a "full sync" operation: delete all old, insert all new
    await Chat.deleteMany({ userId });

    if (chatHistory.length === 0) {
      // If history is empty, we're done
      return res.status(200).json({ message: 'Chat history cleared successfully' });
    }

    const chats = chatHistory.map(chat => {
      if (!chat.title || !Array.isArray(chat.messages)) {
        throw new Error('Invalid chat format: title and messages array required');
      }
      return {
        userId,
        title: chat.title,
        messages: chat.messages.map(msg => ({ text: msg.text, type: msg.type })),
        pinned: chat.pinned || false,
        archived: chat.archived || false,
        createdAt: new Date(), // Use current date for simplicity on save
      };
    });

    await Chat.insertMany(chats);
    res.status(200).json({ message: 'Chat history saved successfully' });
  } catch (error) {
    console.error('Error saving chat history:', error);
    res.status(400).json({ error: error.message || 'Server error saving chat history' });
  }
});

// Admin Endpoint to List Users (Admin Only)
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied, admin only' });
  }

  try {
    // Return all fields except password
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Admin Endpoint to Get User Stats & Chats
app.get('/api/admin/user-chats/:userId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied, admin only' });
  }

  try {
    const { userId } = req.params;
    const chats = await Chat.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ error: 'Server error fetching chats' });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});