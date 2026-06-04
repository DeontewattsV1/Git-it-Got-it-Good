# Contributing to Git-it-Got-it-Good

Thank you for your interest in contributing to Git-it-Got-it-Good!

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Git-it-Got-it-Good.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Making Changes

1. Make your changes in your feature branch
2. Run tests: `npm test`
3. Run linting: `npm run lint` (if applicable)
4. Commit your changes with clear, descriptive messages
5. Push to your fork
6. Open a Pull Request against `main`

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Package Manager:** npm
- **Container:** Docker

## Code Standards

- Follow TypeScript best practices
- Use meaningful variable and function names
- Include JSDoc comments for public functions
- Write tests for new functionality

## Testing

- Write tests using the existing test framework
- Ensure all tests pass before submitting PR
- Follow existing test patterns

## Docker Development

The project includes Docker support for consistent development environments:
- `Dockerfile` - Production container
- `docker-compose.yml` - Local development stack

## Workflow Guidelines

When adding GitHub Actions:
- Use kebab-case for workflow filenames
- Include `name:` at the top
- Use `permissions:` block for security

## Questions?

Feel free to open a Discussion if you have questions about contributing.