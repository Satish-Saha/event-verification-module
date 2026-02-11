const dns = require('dns').promises;
const { checkSMTP } = require('./smtpCheck');
const { getDidYouMean } = require('./didYouMean');

/**
 * Validates the syntax of an email address.
 * @param {string} email 
 * @returns {boolean}
 */
function isValidSyntax(email) {
    if (!email || typeof email !== 'string') return false;
    if (email.trim() === '') return false;

    // Multiple @
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) return false;

    // Double dots
    if (email.includes('..')) return false;

    // Basic regex for standard validation
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Verifies an email address.
 * @param {string} email 
 * @returns {Promise<Object>}
 */
async function verifyEmail(email) {
    const startTime = Date.now();
    const resultTemplate = {
        email: email,
        result: "unknown",
        resultcode: 6,
        subresult: "initial_state",
        domain: null,
        mxRecords: [],
        executiontime: 0,
        error: null,
        timestamp: new Date().toISOString(),
        didyoumean: null
    };

    const updateResult = (overrides) => {
        const endTime = Date.now();
        return {
            ...resultTemplate,
            ...overrides,
            executiontime: parseFloat(((endTime - startTime) / 1000).toFixed(3)),
            timestamp: new Date().toISOString()
        };
    };

    // 1. Syntax validation
    if (!isValidSyntax(email)) {
        return updateResult({
            result: "invalid",
            resultcode: 3,
            subresult: "invalid_syntax",
            error: "Email syntax is invalid"
        });
    }

    const domain = email.split('@')[1];
    resultTemplate.domain = domain;

    // 2. Typo Detection (Part 2)
    const suggestion = getDidYouMean(email);
    if (suggestion) {
        return updateResult({
            result: "invalid",
            resultcode: 3,
            subresult: "typo_detected",
            didyoumean: suggestion,
            error: `Possible typo detected. Did you mean ${suggestion}?`
        });
    }

    // 3. DNS MX Lookup
    let mxRecords = [];
    try {
        const records = await dns.resolveMx(domain);
        mxRecords = records
            .sort((a, b) => a.priority - b.priority)
            .map(r => r.exchange);

        if (mxRecords.length === 0) {
            return updateResult({
                result: "invalid",
                resultcode: 3,
                subresult: "domain_has_no_mx",
                error: "No MX records found for domain"
            });
        }
    } catch (err) {
        return updateResult({
            result: "invalid",
            resultcode: 3,
            subresult: "domain_resolution_failed",
            error: err.message
        });
    }

    resultTemplate.mxRecords = mxRecords;

    // 4. SMTP Check
    try {
        const smtpResponse = await checkSMTP(mxRecords[0], email);

        if (smtpResponse.status === 250) {
            return updateResult({
                result: "valid",
                resultcode: 1,
                subresult: "mailbox_exists"
            });
        } else if (smtpResponse.status === 550) {
            return updateResult({
                result: "invalid",
                resultcode: 3,
                subresult: "mailbox_does_not_exist"
            });
        } else if (smtpResponse.status === 450) {
            return updateResult({
                result: "unknown",
                resultcode: 6,
                subresult: "greylisted"
            });
        } else if (smtpResponse.status === 'timeout') {
            return updateResult({
                result: "unknown",
                resultcode: 6,
                subresult: "connection_error",
                error: "Connection timed out"
            });
        } else {
            return updateResult({
                result: "unknown",
                resultcode: 6,
                subresult: "connection_error",
                error: smtpResponse.message
            });
        }
    } catch (err) {
        return updateResult({
            result: "unknown",
            resultcode: 6,
            subresult: "connection_error",
            error: err.message
        });
    }
}

module.exports = { verifyEmail };
