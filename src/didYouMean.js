const levenshtein = require('fast-levenshtein');

const COMMON_DOMAINS = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'me.com',
    'msn.com',
    'live.com'
];

/**
 * Detects common domain typos using Levenshtein distance <= 2.
 * @param {string} email - The email address to check.
 * @returns {string|null} - The suggested email address or null if no typo detected.
 */
function getDidYouMean(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return null;
    }

    const [user, domain] = email.split('@');
    if (!domain) return null;

    let closestDomain = null;
    let minDistance = 3; // We only care about distance <= 2

    for (const commonDomain of COMMON_DOMAINS) {
        if (domain === commonDomain) return null; // Already correct

        const distance = levenshtein.get(domain, commonDomain);
        if (distance <= 2 && distance < minDistance) {
            minDistance = distance;
            closestDomain = commonDomain;
        }
    }

    return closestDomain ? `${user}@${closestDomain}` : null;
}

module.exports = { getDidYouMean };
