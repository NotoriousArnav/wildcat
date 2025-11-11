---
layout: default
title: Development Guide
nav_order: 5
description: "Contributing guidelines and local development setup"
parent: Documentation
---

# Development Guide

Guidelines for contributing to the Wildcat project.

## Development Workflow

### Branching Strategy

- **`master`** - Production-ready code
- **`feature/*`** - New features (e.g., `feature/add-media-support`)
- **`fix/*`** - Bug fixes (e.g., `fix/message-validation`)
- **`chore/*`** - Maintenance tasks (e.g., `chore/update-deps`)

### Commit Messages

Follow conventional commits:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Testing
- `chore` - Maintenance

Examples:
```
feat: add media upload endpoint
fix: handle invalid message IDs
docs: update API reference
```

### Pull Requests

1. Create a feature branch from `master`
2. Make changes with clear commit messages
3. Test thoroughly (unit tests, manual testing)
4. Update documentation if needed
5. Create PR with description of changes
6. Code review and merge

## Code Style

### JavaScript/Node.js

- **Modules:** CommonJS (require/module.exports)
- **Linting:** [ESLint](https://eslint.org/) is required for all code. Run `npx eslint . --ext .js` before committing. Auto-fix with `--fix`.
- **Formatting:** Consistent indentation (2 spaces)
- **Naming:** camelCase for variables/functions, PascalCase for classes
- **Error Handling:** Use try/catch, return structured error responses
- **Logging:** Use the provided logger utilities from `src/logger.js`

### API Design

- **HTTP Methods:** RESTful (GET, POST, PUT, DELETE)
- **Response Format:** JSON with `{ ok: boolean, ... }` structure
- **Status Codes:** Standard HTTP codes (200, 400, 404, 500)
- **Validation:** Input validation on all endpoints
- **Documentation:** Update API docs for new endpoints

### Linting

- **Run linter:**
  ```bash
  npx eslint . --ext .js
  ```
- **Auto-fix:**
  ```bash
  npx eslint . --ext .js --fix
  ```
- **Config:** See `eslint.config.js` in the project root.
- **CI:** Linting is enforced in GitHub Actions.

### Example Code Structure

```javascript
// Good: Clear function with error handling
async function sendMessage(req, res) {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({
      ok: false,
      error: 'to and message are required'
    });
  }

  try {
    const result = await whatsapp.sendMessage(to, { text: message });
    return res.status(200).json({ ok: true, messageId: result.key.id });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}
```

## Testing

### Manual Testing

Use curl for API testing:

```bash
# Health check
curl http://localhost:3000/ping

# Create account
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id": "test", "name": "Test Account"}'

# Send message
curl -X POST http://localhost:3000/accounts/test/message/send \
  -H 'Content-Type: application/json' \
  -d '{"to": "1234567890@s.whatsapp.net", "message": "Test"}'
```

### Automated Testing

- Add unit tests for utility functions
- Integration tests for API endpoints
- Test with different message types and edge cases

## Debugging

### Logging

The app uses structured JSON logging. Check logs in `.logs/` directory:

```bash
# View all logs
tail -f .logs/*.log

# Filter by type
tail -f .logs/http.log
tail -f .logs/baileys.log
```

### Common Issues

- **MongoDB connection:** Check MONGO_URL in .env
- **Port conflicts:** Ensure PORT is available
- **QR scanning:** Regenerate if expired
- **Media uploads:** Check file size limits

## Environment Setup

### Local Development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Start MongoDB locally or use cloud instance
4. Run in dev mode: `npm run dev`

### Environment Variables

```env
# Required
MONGO_URL=mongodb://localhost:27017
DB_NAME=wildcat
HOST=0.0.0.0
PORT=3000

# Optional
LOG_LEVEL=debug
NODE_ENV=development
```

## Performance

### Optimization Tips

- Use connection pooling for MongoDB
- Stream large files instead of buffering
- Implement caching for frequently accessed data
- Monitor memory usage and response times

### Profiling

```bash
# Memory usage
node --inspect src/index.js

# Performance monitoring
npm install -g clinic
clinic doctor -- node src/index.js
```

## Security

### Best Practices

- Validate all user inputs
- Use environment variables for secrets
- Implement rate limiting
- Log security events
- Keep dependencies updated

### TODO

- Add authentication middleware
- Implement input sanitization
- Add rate limiting
- Set up monitoring/alerts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

Thank you for contributing to Wildcat! 🎉