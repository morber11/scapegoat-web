import { describe, it, expect } from 'vitest';
import { styleFallback } from './styleFallback';
import type { ChatMessage } from '../types/chat';

function userMsg(content: string): ChatMessage {
    return { id: '1', role: 'user', content, timestamp: 0 };
}

describe('styleFallback', () => {
    it('lowercases the reply when user types in all lowercase', () => {
        const result = styleFallback('Hello world', [userMsg('hi there')]);
        expect(result).toBe('hello world');
    });

    it('keeps reply capitalized when user uses uppercase', () => {
        const result = styleFallback('Hello world', [userMsg('Hi there')]);
        expect(result).toBe('Hello world');
    });

    it('appends a period when user ends with period and reply has no ending punctuation', () => {
        const result = styleFallback('My bad', [userMsg('Ok.')]);
        expect(result).toBe('My bad.');
    });

    it('does not double punctuation when reply already ends with a period', () => {
        const result = styleFallback('My bad.', [userMsg('Ok.')]);
        expect(result).toBe('My bad.');
    });

    it('does not append period when reply already ends with ! or ?', () => {
        expect(styleFallback('Sorry!', [userMsg('Ok.')])).toBe('Sorry!');
        expect(styleFallback('Sorry?', [userMsg('Ok.')])).toBe('Sorry?');
    });

    it('returns reply unchanged when there are no messages', () => {
        const result = styleFallback('Hello', []);
        expect(result).toBe('Hello');
    });
});
