// js/services/authService.js
// Authentication & User Session Service
import { authenticate, login, logout, getCurrentUser, getAllUsers, ROLES } from '../models/User.js';

export {
    authenticate,
    login,
    logout,
    getCurrentUser,
    getAllUsers,
    ROLES
};

export default {
    authenticate,
    login,
    logout,
    getCurrentUser,
    getAllUsers,
    ROLES
};
