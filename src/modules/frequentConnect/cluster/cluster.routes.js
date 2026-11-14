const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const clusterController = require('./cluster.controller');

// All cluster routes require authentication
router.use(protect);

router.post('/', clusterController.createCluster);
router.get('/', clusterController.getClusters);
router.patch('/reorder', clusterController.reorderClusters);
router.get('/:id', clusterController.getClusterById);
router.put('/:id', clusterController.updateCluster);
router.delete('/:id', clusterController.deleteCluster);

module.exports = router;
