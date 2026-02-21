const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Log = require('../models/Log');
dotenv.config();
console.log("MONGO_URI:", process.env.MONGO_URI);
const connectDB = require('./db');

const seed = async () => {
  await connectDB();

  console.log('🌱 Seeding database...');

  // Clear existing
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});
  await Log.deleteMany({});

  // Create users
  const password = await bcrypt.hash('password@123', 10);

  const users = await User.insertMany([
    { name: 'Ashu Vishwakarma', email: 'admin@sprinto.com', password: await bcrypt.hash('admin123', 10), role: 'admin', color: '#6366f1', avatar: 'AC' },
    { name: 'Jaya ', email: 'manager@sprinto.com', password: await bcrypt.hash('manager123', 10), role: 'manager', color: '#0ea5e9', avatar: 'JL' },
    { name: 'Sattu', email: 'sattu@sprinto.com', password: password, role: 'user', color: '#10b981', avatar: 'SR' },
    { name: 'AK Singh', email: 'aksingh@sprinto.com', password: password, role: 'user', color: '#f59e0b', avatar: 'MD' },
  ]);

  const [admin, manager, sam, morgan] = users;

  // Create projects
  const projects = await Project.insertMany([
    {
      name: 'Apollo Platform',
      description: 'Next-gen cloud infrastructure rebuild',
      color: '#6366f1',
      manager: manager._id,
      members: [manager._id, sam._id, morgan._id],
      status: 'active',
    },
    {
      name: 'Nebula Dashboard',
      description: 'Analytics dashboard redesign with real-time metrics',
      color: '#0ea5e9',
      manager: manager._id,
      members: [manager._id, sam._id],
      status: 'active',
    },
    {
      name: 'Orion API',
      description: 'REST API refactor and GraphQL migration',
      color: '#10b981',
      manager: admin._id,
      members: [admin._id, morgan._id],
      status: 'active',
    },
  ]);

  const [apollo, nebula, orion] = projects;

  // Create tasks
  const tasks = await Task.insertMany([
    { project: apollo._id, title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', status: 'done', priority: 'high', assignee: sam._id, createdBy: manager._id, dueDate: new Date('2026-01-25'), tags: ['devops', 'automation'] },
    { project: apollo._id, title: 'Design microservices architecture', description: 'Define service boundaries and communication patterns', status: 'in-progress', priority: 'high', assignee: manager._id, createdBy: manager._id, dueDate: new Date('2026-02-10'), tags: ['architecture'] },
    { project: apollo._id, title: 'Implement OAuth 2.0', description: 'Integrate third-party auth providers', status: 'todo', priority: 'medium', assignee: morgan._id, createdBy: manager._id, dueDate: new Date('2026-02-20'), tags: ['auth', 'security'] },
    { project: apollo._id, title: 'Load testing & benchmarks', description: 'Stress test all API endpoints under production-like load', status: 'todo', priority: 'low', assignee: sam._id, createdBy: admin._id, dueDate: new Date('2026-03-01'), tags: ['testing'] },
    { project: nebula._id, title: 'Wireframe dashboard layout', description: 'Create hi-fi mockups for all dashboard views', status: 'done', priority: 'high', assignee: manager._id, createdBy: manager._id, dueDate: new Date('2026-01-28'), tags: ['design'] },
    { project: nebula._id, title: 'Build chart components', description: 'Implement reusable Recharts components with theming', status: 'in-progress', priority: 'high', assignee: sam._id, createdBy: manager._id, dueDate: new Date('2026-02-15'), tags: ['frontend', 'charts'] },
    { project: nebula._id, title: 'Real-time WebSocket feed', description: 'Connect live data stream to dashboard metrics', status: 'todo', priority: 'medium', assignee: sam._id, createdBy: manager._id, dueDate: new Date('2026-02-25'), tags: ['backend', 'realtime'] },
    { project: orion._id, title: 'Document all REST endpoints', description: 'Generate OpenAPI 3.0 spec for existing endpoints', status: 'in-progress', priority: 'medium', assignee: morgan._id, createdBy: admin._id, dueDate: new Date('2026-02-18'), tags: ['docs'] },
    { project: orion._id, title: 'GraphQL schema design', description: 'Design type-safe schema for all entities', status: 'todo', priority: 'high', assignee: admin._id, createdBy: admin._id, dueDate: new Date('2026-03-05'), tags: ['graphql'] },
  ]);

  // Create logs
  await Log.insertMany([
    { user: manager._id, action: 'Created project', target: 'Apollo Platform', targetType: 'project', project: apollo._id },
    { user: sam._id, action: 'Completed task', target: 'Set up CI/CD pipeline', targetType: 'task', project: apollo._id },
    { user: manager._id, action: 'Created project', target: 'Nebula Dashboard', targetType: 'project', project: nebula._id },
    { user: admin._id, action: 'Created project', target: 'Orion API', targetType: 'project', project: orion._id },
    { user: sam._id, action: 'Started task', target: 'Build chart components', targetType: 'task', project: nebula._id },
    { user: morgan._id, action: 'Started task', target: 'Document all REST endpoints', targetType: 'task', project: orion._id },
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('\nDemo credentials:');
  console.log('  Admin:   admin@sprinto.com   / admin@123');
  console.log('  Manager: manager@sprinto.com / manager@123');
  console.log('  User:    sattu@sprinto.com     / password@123');
  console.log('  User:    aksingh@sprinto.com  / password@123\n');

  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
