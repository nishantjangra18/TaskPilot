const express = require('express');
const router = express.Router();
const { chatWithAI, testDeepSeekConnection, applyAIAction, generateAIProjectPreview, createAIProject } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { aiRateLimiter } = require('../middleware/aiRateLimiter');

router.use(protect);
router.use(aiRateLimiter);

router.post('/test', testDeepSeekConnection);
router.post('/chat', chatWithAI);
router.post('/apply-action', applyAIAction);
router.post('/project-preview', generateAIProjectPreview);
router.post('/create-project', createAIProject);

module.exports = router;
