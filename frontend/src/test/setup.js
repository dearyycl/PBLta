import '@testing-library/jest-dom/vitest';

// jsdom tidak punya scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
