import { queryOne } from '../config/db.js';
import { HttpError } from './error.js';

// Get project ID from params or body
const getProjectId = (req) => req.params.projectId || req.params.id || req.body.project_id;

export async function requireMember(req, res, next) {
  try {
    const projectId = getProjectId(req);
    if (!projectId) throw new HttpError(400, 'Project ID is required');

    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (!member) throw new HttpError(403, 'You do not have access to this project');
    
    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireEditor(req, res, next) {
  try {
    const projectId = getProjectId(req);
    if (!projectId) throw new HttpError(400, 'Project ID is required');

    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (!member) throw new HttpError(403, 'You do not have access to this project');
    if (member.role === 'viewer') throw new HttpError(403, 'Viewers cannot perform this action');
    
    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireOwner(req, res, next) {
  try {
    const projectId = getProjectId(req);
    if (!projectId) throw new HttpError(400, 'Project ID is required');

    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (!member) throw new HttpError(403, 'You do not have access to this project');
    if (member.role !== 'owner') throw new HttpError(403, 'Only the project owner can perform this action');
    
    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
}