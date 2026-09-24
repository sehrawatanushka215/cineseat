// Registers the @testing-library/jest-dom matchers with TypeScript.
// jest.setup.js loads them at runtime; this file is what makes
// `expect(...).toBeInTheDocument()` type-check.
import "@testing-library/jest-dom";
