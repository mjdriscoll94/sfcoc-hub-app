import { describe, expect, it } from 'vitest';
import { parseLeadershipLessonInput } from './input';

const baseInput = {
  title: 'Leading through service',
  description: 'A practical introduction to serving others.',
  youtubeVideoId: 'dQw4w9WgXcQ',
  status: 'draft',
  captionsReviewed: false,
};

describe('leadership lesson input', () => {
  it('allows a lesson without a PDF', () => {
    expect(parseLeadershipLessonInput({ ...baseInput, pdfUrl: '', pdfFileName: '' })).toMatchObject({
      pdfUrl: '',
      pdfFileName: '',
    });
  });

  it('normalizes omitted PDF fields for a video-only lesson', () => {
    expect(parseLeadershipLessonInput(baseInput)).toMatchObject({
      pdfUrl: '',
      pdfFileName: '',
    });
  });

  it('requires a file name when a PDF is attached', () => {
    expect(() => parseLeadershipLessonInput({
      ...baseInput,
      pdfUrl: 'https://example.com/lesson.pdf',
      pdfFileName: '',
    })).toThrow('PDF file name is required.');
  });
});
