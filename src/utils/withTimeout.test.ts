import { describe, it, expect } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
    it('resolves if the promise settles before the timeout', async () => {
        const result = await withTimeout(Promise.resolve('done'), 5000);
        expect(result).toBe('done');
    });

    it('rejects if the promise takes longer than the timeout', async () => {
        const slow = new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 500));
        await expect(withTimeout(slow, 50)).rejects.toThrow('Request timed out');
    });
});
