const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Restrict to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

// Check if user is member of a project (or admin)
const projectMember = async (req, res, next) => {
  const Project = require('../models/Project');
  const projectId = req.params.projectId || req.body.project || req.query.project;

  if (!projectId) return next();

  if (req.user.role === 'admin') return next();

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isMember = project.members.some((m) => m.toString() === req.user._id.toString());
    const isManager = project.manager.toString() === req.user._id.toString();

    if (!isMember && !isManager) {
      return res.status(403).json({ success: false, message: 'Not a member of this project' });
    }

    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, authorize, projectMember };
