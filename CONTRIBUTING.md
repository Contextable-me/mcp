# Contributing to @contextable/mcp

Thank you for your interest in contributing to Contextable MCP!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp.git
   cd mcp
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to make sure everything works:
   ```bash
   npm test
   ```

## Development

### Running locally

```bash
# Start in development mode (local storage)
npm run dev

# Start with HTTP transport
npm run dev -- --sse --port 3000

# Run tests in watch mode
npm test
```

### Code Style

- TypeScript with strict mode
- ESLint for linting
- All functions must have type annotations

### Testing

We use Vitest for testing. Run tests with:

```bash
npm test          # Watch mode
npm run test:run  # Single run
```

All new features should include tests.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `npm run test:run`
5. Ensure code compiles: `npm run typecheck`
6. Submit a pull request

### Commit Messages

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Include your Node.js version and OS

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
