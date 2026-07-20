const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const verifyToken = require('../middleware/auth');

router.post('/', verifyToken, clientController.addClient);
router.get('/', verifyToken, clientController.getClients);
router.put('/:id', verifyToken, clientController.updateClient);
router.delete('/:id', verifyToken, clientController.deleteClient);

module.exports = router;
