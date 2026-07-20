import { describe, expect, it } from 'vitest';

import {
  decodeBackgroundMedia,
  isBackgroundMedia,
  type BackgroundMedia,
} from './backgroundMedia';

describe('background media decoding', () => {
  const fallback: BackgroundMedia = {
    source: 'file',
    type: 'image',
    url: '',
  };

  it('accepts valid media and an explicit cleared value', () => {
    const media: BackgroundMedia = {
      source: 'url',
      type: 'video',
      url: 'https://example.com/background.webm',
    };

    expect(isBackgroundMedia(media)).toBe(true);
    expect(decodeBackgroundMedia(media, fallback)).toBe(media);
    expect(decodeBackgroundMedia(null, fallback)).toBeNull();
  });

  it.each([
    undefined,
    'https://example.com/background.jpg',
    { source: 'remote', type: 'image', url: '' },
    { source: 'file', type: 'audio', url: '' },
    { source: 'file', type: 'image', url: 42 },
  ])('uses the fallback for invalid media: %j', (value) => {
    expect(isBackgroundMedia(value)).toBe(false);
    expect(decodeBackgroundMedia(value, fallback)).toBe(fallback);
  });
});
