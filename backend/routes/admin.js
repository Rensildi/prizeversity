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

// view all admins
router.get('/admins', ensureAuthenticated, isAdmin, async(req, res) => {
    try {
        const admins = await User.find({ role: 'admin'}).select('-password');
        res.json(admins);
    } catch (error) {
        res.status(500).json({error: 'Internal Server Error!'});
    }
});

// view all classrooms
router.get('/classrooms', ensureAuthenticated, isAdmin, async(req, res) => {
    try {
        const classrooms = await Classroom.find().populate('teacher').populate('students')
        res.json(classrooms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch classrooms'});
    }
})

// Here more functionalities will be implemented
// Manage classrooms
// deleting groups
// etc.

module.exports = router;