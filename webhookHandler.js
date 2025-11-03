const axios = require('axios');

/**
 * Send a JSON payload to a webhook URL via HTTP POST.
 * Returns { ok: boolean, status, data } on success, or { ok: false, error } on failure.
 */
async function sendToWebhook(url, payload, options = {}) {
  try {
    const res = await axios.post(url, payload, {
      timeout: options.timeoutMs ?? 10000,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
      validateStatus: () => true, // we'll return status to caller
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendToWebhook };
