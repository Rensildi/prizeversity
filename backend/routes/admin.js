const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth.js');
const isAdmin = require('../middleware/isAdmin.js');
const User = require('../models/User.js');
const Classroom = require('../models/Classroom.js');

// view all users
router.get('/users', ensureAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-passowrd'); // Hiding password if present
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users'});
    }
});


// Here more functionalities will be implemented
// Manage classrooms
// deleting groups
// etc.

module.exports = router;