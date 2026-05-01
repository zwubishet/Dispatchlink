const express = require('express');
const router = express.Router();

// Hasura event/action webhook handler
// Hasura calls these endpoints when actions are triggered from GraphQL

router.post('/order-status-changed', (req, res) => {
  // Placeholder for notification logic (SMS, push, etc.)
  const { event } = req.body;
  console.log('[Hasura Action] order-status-changed:', event?.data?.new?.status);
  res.json({ success: true });
});

module.exports = router;
