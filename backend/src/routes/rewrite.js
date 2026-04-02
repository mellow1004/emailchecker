import express from 'express';
import { getRewrite } from '../services/rewrite.js';
import { getRewriteSv } from '../services/rewrite_sv.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const emailText = req.body?.emailText ?? req.body?.draft ?? '';
  const checkId = req.body?.checkId ?? '';
  const checkLabel = req.body?.checkLabel ?? '';
  const value = req.body?.value;
  const message = req.body?.message ?? '';
  const locale = req.body?.locale || 'US';
  const language = req.body?.language || 'EN';

  try {
    const rewrite =
      language === 'SV'
        ? await getRewriteSv(emailText, checkLabel, value, message, checkId, 'SV')
        : await getRewrite(emailText, checkLabel, value, message, checkId, locale);

    res.json({ rewrite });
  } catch (err) {
    console.error('[rewrite]', err.message);
    res.status(500).json({
      error: err.message || 'Rewrite failed',
      rewrite: '',
    });
  }
});

export default router;
