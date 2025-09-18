const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { usersCollection, serverTimestamp } = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { calculateAge } = require('../utils/helpers');

const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      fullName, 
      dateOfBirth, 
      gender,
      profileImageUrl,
      preferences 
    } = req.body;

    // Validation - required fields
    if (!email || !password || !fullName || !dateOfBirth || !gender) {
      return res.status(400).json({ 
        error: 'Email, password, full name, date of birth, and gender are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Validate date of birth
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: 'Please provide a valid date of birth' });
    }

    // Check if user already exists
    const existingUserSnapshot = await usersCollection.where('email', '==', email).get();
    if (!existingUserSnapshot.empty) {
      return res.status(409).json({ 
        error: 'An account with this email already exists. Would you like to sign in instead?',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate age from date of birth
    const age = calculateAge(dateOfBirth);

    // Prepare user data according to the new schema
    const currentTime = serverTimestamp();
    const userData = {
      email,
      password: hashedPassword,
      fullName,
      dateOfBirth: new Date(dateOfBirth),
      age,
      gender,
      uid: '',
      isActive: true,
      CreatedAt: currentTime,
      updatedAt: currentTime,
      lastLoginAt: currentTime,
      profileImageUrl: profileImageUrl || '/',
      preferences: {
        language: preferences?.language || 'he',
        notifications: preferences?.notifications !== undefined ? preferences.notifications : true,
        theme: preferences?.theme || 'black'
      }
    };

    // Create user in Firestore
    const userDoc = await usersCollection.add(userData);

    // Update the uid field with the document ID
    await usersCollection.doc(userDoc.id).update({
      uid: userDoc.id
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: userDoc.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (excluding password)
    const { password: _, ...userResponse } = userData;
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userResponse
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const userSnapshot = await usersCollection.where('email', '==', email).get();
    
    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: userDoc.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await usersCollection.doc(userDoc.id).update({
      lastLoginAt: serverTimestamp()
    });

    // Return user data (excluding password)
    const { password: _, ...userDataResponse } = userData;

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userDataResponse
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userDoc = await usersCollection.doc(req.user.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Return complete user profile (excluding password)
    const { password: _, ...userProfile } = userData;
    
    res.json({
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userProfile
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;