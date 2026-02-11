const { SMTPClient } = require('smtp-client');

/**
 * Connects to an MX server and performs HELO, MAIL FROM, and RCPT TO checks.
 * @param {string} host - The MX server hostname.
 * @param {string} email - The email address to verify.
 * @returns {Promise<Object>} - SMTP response details.
 */
async function checkSMTP(host, email) {
    const client = new SMTPClient({
        host: host,
        port: 25,
        timeout: 10000 // 10 seconds timeout
    });

    try {
        await client.connect();
        await client.greet({ hostname: 'verifier.local' });
        await client.mail({ from: 'verify@example.com' });

        try {
            const response = await client.rcpt({ to: email });
            // smtp-client usually returns a response object with status
            // If it doesn't throw, it's likely a 250
            return { status: 250, message: 'Mailbox exists' };
        } catch (err) {
            // Handle SMTP error codes
            const statusCode = err.status || (err.message && parseInt(err.message.match(/^\d{3}/)?.[0]));

            if (statusCode === 550) {
                return { status: 550, message: 'Mailbox does not exist' };
            } else if (statusCode === 450 || statusCode === 451 || statusCode === 452) {
                return { status: 450, message: 'Greylisted / Temporary failure' };
            }
            throw err;
        } finally {
            try {
                await client.quit();
            } catch (e) {
                // Ignore quit errors
            }
        }
    } catch (err) {
        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.message.includes('timeout')) {
            return { status: 'timeout', message: err.message };
        }
        return { status: 'error', message: err.message };
    }
}

module.exports = { checkSMTP };
