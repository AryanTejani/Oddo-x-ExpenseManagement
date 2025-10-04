const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('company');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

const requireCompany = (req, res, next) => {
  if (!req.user || !req.user.company) {
    return res.status(403).json({ message: 'Company access required' });
  }

  // Check if user is accessing their own company's resources
  const companyId = req.params.companyId || req.body.companyId || req.query.companyId;
  if (companyId && companyId !== req.user.company._id.toString()) {
    return res.status(403).json({ message: 'Access denied to this company' });
  }

  next();
};

const requireManagerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Manager or Admin access required',
      current: req.user.role
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireCompany,
  requireManagerOrAdmin
};

