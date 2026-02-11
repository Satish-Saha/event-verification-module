const { verifyEmail } = require('../src/verifyEmail');
const dns = require('dns').promises;
const { checkSMTP } = require('../src/smtpCheck');

// Mock DNS and SMTP check
jest.mock('dns', () => ({
    promises: {
        resolveMx: jest.fn()
    }
}));
jest.mock('../src/smtpCheck', () => ({
    checkSMTP: jest.fn()
}));

describe('Email Verification Module', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Syntax Tests ---

    test('valid email passes syntax and continues', async () => {
        dns.resolveMx.mockResolvedValue([{ priority: 10, exchange: 'mx.gmail.com' }]);
        checkSMTP.mockResolvedValue({ status: 250 });

        const result = await verifyEmail('test@gmail.com');
        expect(result.result).toBe('valid');
        expect(result.subresult).toBe('mailbox_exists');
    });

    test('missing @ rejected', async () => {
        const result = await verifyEmail('testgmail.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('invalid_syntax');
    });

    test('multiple @ rejected', async () => {
        const result = await verifyEmail('test@@gmail.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('invalid_syntax');
    });

    test('empty string handled', async () => {
        const result = await verifyEmail('');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('invalid_syntax');
    });

    test('null handled', async () => {
        const result = await verifyEmail(null);
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('invalid_syntax');
    });

    test('undefined handled', async () => {
        const result = await verifyEmail(undefined);
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('invalid_syntax');
    });

    test('double dots rejected', async () => {
        const result = await verifyEmail('test..user@gmail.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('invalid_syntax');
    });

    test('very long email handled (rejected by regex or length)', async () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        dns.resolveMx.mockRejectedValue(new Error('Domain not found'));
        const result = await verifyEmail(longEmail);
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('domain_resolution_failed');
    });

    // --- Typo Detection Tests ---

    test('gmial.com suggests gmail.com', async () => {
        const result = await verifyEmail('user@gmial.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('typo_detected');
        expect(result.didyoumean).toBe('user@gmail.com');
    });

    test('hotmial.com suggests hotmail.com', async () => {
        const result = await verifyEmail('user@hotmial.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('typo_detected');
        expect(result.didyoumean).toBe('user@hotmail.com');
    });

    // --- DNS Tests ---

    test('no MX record -> invalid domain_has_no_mx', async () => {
        dns.resolveMx.mockResolvedValue([]);
        const result = await verifyEmail('test@example.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('domain_has_no_mx');
    });

    test('domain resolution fails -> invalid domain_resolution_failed', async () => {
        dns.resolveMx.mockRejectedValue(new Error('queryMx ENOTFOUND example.com'));
        const result = await verifyEmail('test@invalid-domain-xyz.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('domain_resolution_failed');
    });

    // --- SMTP Code Tests ---

    test('SMTP 550 -> invalid mailbox_does_not_exist', async () => {
        dns.resolveMx.mockResolvedValue([{ priority: 10, exchange: 'mx.gmail.com' }]);
        checkSMTP.mockResolvedValue({ status: 550 });

        const result = await verifyEmail('nonexistent@gmail.com');
        expect(result.result).toBe('invalid');
        expect(result.subresult).toBe('mailbox_does_not_exist');
    });

    test('SMTP 450 -> unknown greylisted', async () => {
        dns.resolveMx.mockResolvedValue([{ priority: 10, exchange: 'mx.gmail.com' }]);
        checkSMTP.mockResolvedValue({ status: 450 });

        const result = await verifyEmail('grey@gmail.com');
        expect(result.result).toBe('unknown');
        expect(result.subresult).toBe('greylisted');
    });

    test('SMTP timeout -> unknown connection_error', async () => {
        dns.resolveMx.mockResolvedValue([{ priority: 10, exchange: 'mx.gmail.com' }]);
        checkSMTP.mockResolvedValue({ status: 'timeout' });

        const result = await verifyEmail('timeout@gmail.com');
        expect(result.result).toBe('unknown');
        expect(result.subresult).toBe('connection_error');
        expect(result.error).toBe('Connection timed out');
    });

    test('SMTP connection error -> unknown connection_error', async () => {
        dns.resolveMx.mockResolvedValue([{ priority: 10, exchange: 'mx.gmail.com' }]);
        checkSMTP.mockResolvedValue({ status: 'error', message: 'Connection refused' });

        const result = await verifyEmail('error@gmail.com');
        expect(result.result).toBe('unknown');
        expect(result.subresult).toBe('connection_error');
    });

});
