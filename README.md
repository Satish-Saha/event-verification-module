# Email Verifier Module

A complete Node.js module for email verification using syntax checks, typo suggestions, DNS MX lookups, and SMTP handshake verification.

## Features

- **Syntax Validation**: Validates email format, checking for missing or multiple `@` symbols, double dots, etc.
- **Typo Suggestion**: Uses Levenshtein distance (up to 2) to suggest corrections for common domains (e.g., `gmial.com` -> `gmail.com`).
- **DNS MX Lookup**: Retrieves mail exchange records for the domain.
- **SMTP Verification**: Connects to the primary MX server and performs HELO, MAIL FROM, and RCPT TO checks to verify mailbox existence.
- **Detailed Reporting**: Returns structured JSON with result codes, sub-results, execution time, and error messages.

## Installation

```bash
npm install
```

## Usage

```javascript
const { verifyEmail } = require('./src/verifyEmail');

(async () => {
    const result = await verifyEmail('user@gmail.com');
    console.log(JSON.stringify(result, null, 2));
})();
```

### Example Output

```json
{
  "email": "user@gmial.com",
  "result": "invalid",
  "resultcode": 3,
  "subresult": "typo_detected",
  "domain": "gmial.com",
  "mxRecords": [],
  "executiontime": 0.005,
  "error": "Possible typo detected. Did you mean user@gmail.com?",
  "timestamp": "2026-02-11T22:00:00.000Z",
  "didyoumean": "user@gmail.com"
}
```

## Result Codes

| Code | Result | Description |
|---|---|---|
| 1 | valid | Mailbox confirmed to exist. |
| 3 | invalid | Mailbox does not exist or syntax/domain error. |
| 6 | unknown | Could not verify (greylisted or connection error). |

## Running Tests

The project uses Jest for unit testing. All external network calls (DNS, SMTP) are mocked.

```bash
npm test
```

## Project Structure

- `src/verifyEmail.js`: Main logic and orchestration.
- `src/smtpCheck.js`: SMTP client interaction.
- `src/didYouMean.js`: Typo detection logic.
- `tests/`: Jest test suite.
