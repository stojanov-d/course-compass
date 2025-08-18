import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { appConfig } from '../config/appConfig';

class InputSanitizationService {
  private static instance: InputSanitizationService;
  private purify: typeof DOMPurify;

  constructor() {
    const window = new JSDOM('').window;
    this.purify = DOMPurify(window as any);
  }

  static getInstance(): InputSanitizationService {
    if (!InputSanitizationService.instance) {
      InputSanitizationService.instance = new InputSanitizationService();
    }
    return InputSanitizationService.instance;
  }

  sanitizeText(input: string): string {
    if (!appConfig.security.enableInputSanitization) {
      return input.trim();
    }

    return this.purify
      .sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      })
      .trim();
  }

  sanitizeComment(commentText: string): string {
    const sanitized = this.sanitizeText(commentText);

    if (sanitized.length < appConfig.validation.minCommentLength) {
      throw new Error(
        `Comment must be at least ${appConfig.validation.minCommentLength} characters long`
      );
    }

    if (sanitized.length > appConfig.validation.maxCommentLength) {
      throw new Error(
        `Comment must be less than ${appConfig.validation.maxCommentLength} characters long`
      );
    }

    return sanitized;
  }

  sanitizeReview(reviewText: string): string {
    const sanitized = this.sanitizeText(reviewText);

    if (sanitized.length < appConfig.validation.minReviewLength) {
      throw new Error(
        `Review must be at least ${appConfig.validation.minReviewLength} characters long`
      );
    }

    if (sanitized.length > appConfig.validation.maxReviewLength) {
      throw new Error(
        `Review must be less than ${appConfig.validation.maxReviewLength} characters long`
      );
    }

    return sanitized;
  }

  validateRating(rating: number, min: number = 1, max: number = 5): void {
    if (rating < min || rating > max || !Number.isInteger(rating)) {
      throw new Error(`Rating must be an integer between ${min} and ${max}`);
    }
  }
}

export const inputSanitizationService = InputSanitizationService.getInstance();
