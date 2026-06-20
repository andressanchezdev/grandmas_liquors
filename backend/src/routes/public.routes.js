const express = require('express');
const controller = require('../controllers/public.controllers');

const router = express.Router();

router.get('/catalogo', controller.getCatalogo);

module.exports = router;
