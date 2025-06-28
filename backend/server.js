require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// For now, we'll use in-memory storage for testing
// You can replace this with Firebase/database later
let users = [];
let dogs = []; // Add dogs storage

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dog App Backend is running!' });
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (in-memory for now)
    const newUser = {
      id: Date.now().toString(), // Simple ID generation
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    user.lastLogin = new Date();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (protected route)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can track it server-side if needed)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// DOG MANAGEMENT ROUTES

// Get all dogs for the authenticated user
app.get('/api/dogs', authenticateToken, (req, res) => {
  try {
    const userDogs = dogs.filter(dog => dog.userId === req.user.userId);
    res.json({ dogs: userDogs });
  } catch (error) {
    console.error('Get dogs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new dog for the authenticated user
app.post('/api/dogs', authenticateToken, (req, res) => {
  try {
    const { name, breed, age, emoji, weight, birthday, notes } = req.body;

    // Validation
    if (!name || !breed || !age) {
      return res.status(400).json({ error: 'Name, breed, and age are required' });
    }

    // Create new dog
    const newDog = {
      id: Date.now().toString(),
      userId: req.user.userId, // Associate with authenticated user
      name,
      breed,
      age: parseInt(age),
      emoji: emoji || '🐕',
      weight: weight || null,
      birthday: birthday || null,
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    dogs.push(newDog);

    res.status(201).json({
      message: 'Dog added successfully',
      dog: newDog
    });

  } catch (error) {
    console.error('Add dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a dog (only if it belongs to the authenticated user)
app.put('/api/dogs/:dogId', authenticateToken, (req, res) => {
  try {
    const { dogId } = req.params;
    const { name, breed, age, emoji, weight, birthday, notes } = req.body;

    // Find the dog
    const dogIndex = dogs.findIndex(dog => dog.id === dogId && dog.userId === req.user.userId);
    
    if (dogIndex === -1) {
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Update the dog
    dogs[dogIndex] = {
      ...dogs[dogIndex],
      name: name || dogs[dogIndex].name,
      breed: breed || dogs[dogIndex].breed,
      age: age ? parseInt(age) : dogs[dogIndex].age,
      emoji: emoji || dogs[dogIndex].emoji,
      weight: weight !== undefined ? weight : dogs[dogIndex].weight,
      birthday: birthday !== undefined ? birthday : dogs[dogIndex].birthday,
      notes: notes !== undefined ? notes : dogs[dogIndex].notes,
      updatedAt: new Date()
    };

    res.json({
      message: 'Dog updated successfully',
      dog: dogs[dogIndex]
    });

  } catch (error) {
    console.error('Update dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a dog (only if it belongs to the authenticated user)
app.delete('/api/dogs/:dogId', authenticateToken, (req, res) => {
  try {
    const { dogId } = req.params;

    // Find the dog
    const dogIndex = dogs.findIndex(dog => dog.id === dogId && dog.userId === req.user.userId);
    
    if (dogIndex === -1) {
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    // Remove the dog
    dogs.splice(dogIndex, 1);

    res.json({ message: 'Dog deleted successfully' });

  } catch (error) {
    console.error('Delete dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific dog (only if it belongs to the authenticated user)
app.get('/api/dogs/:dogId', authenticateToken, (req, res) => {
  try {
    const { dogId } = req.params;

    const dog = dogs.find(dog => dog.id === dogId && dog.userId === req.user.userId);
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found or not authorized' });
    }

    res.json({ dog });

  } catch (error) {
    console.error('Get dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🐕 Dog App Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Endpoints:`);
  console.log(`AUTH:`);
  console.log(`  POST http://localhost:${PORT}/api/auth/register`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`  POST http://localhost:${PORT}/api/auth/logout`);
  console.log(`DOGS:`);
  console.log(`  GET    http://localhost:${PORT}/api/dogs`);
  console.log(`  POST   http://localhost:${PORT}/api/dogs`);
  console.log(`  GET    http://localhost:${PORT}/api/dogs/:dogId`);
  console.log(`  PUT    http://localhost:${PORT}/api/dogs/:dogId`);
  console.log(`  DELETE http://localhost:${PORT}/api/dogs/:dogId`);
});