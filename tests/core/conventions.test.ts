import { describe, expect, it } from 'vitest';
import { classifyStem, inferFileNameStyle, isAllowedStem } from '../../src/core/conventions';

describe('conventions', () => {
  it('classifies kebab, camel, and pascal stems', () => {
    expect(classifyStem('user-service')).toBe('kebab');
    expect(classifyStem('userService')).toBe('camel');
    expect(classifyStem('UserService')).toBe('pascal');
    expect(classifyStem('index')).toBe('neutral');
  });

  it('infers kebab when it is the majority', () => {
    expect(inferFileNameStyle(['user-service', 'user-card', 'user-list', 'userProfile'])).toBe('kebab');
  });

  it('allows kebab, camel, and PascalCase together', () => {
    expect(isAllowedStem('user-profile.component', 'camel')).toBe(true);
    expect(isAllowedStem('userProfile', 'kebab')).toBe(true);
    expect(isAllowedStem('Catalog', 'camel')).toBe(true);
    expect(isAllowedStem('user_service', 'camel')).toBe(false);
  });

  it('allows every common style when there is no majority', () => {
    expect(isAllowedStem('user-service', 'mixed')).toBe(true);
    expect(isAllowedStem('userService', 'mixed')).toBe(true);
  });
});
