const { createDoc } = require('./firestore.service');

function recordAudit(req, { action, entityType, entity, changedFields = [] }) {
  return createDoc('auditLog', {
    actorId: req.user.uid,
    actorRole: req.user.role,
    action,
    entityType,
    entityId: entity.id,
    entityName: entity.name || entity.sku || entity.id,
    changedFields,
  });
}

module.exports = { recordAudit };
