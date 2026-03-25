# Contributing to Bedrock Lens

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/bedrock-lens.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Test locally (see Development section in README)
6. Push and open a Pull Request

## Development Setup

```bash
npm install              # Install CDK dependencies
cd frontend && npm install  # Install frontend dependencies
cd frontend && npm run dev  # Start local dev server
```

## Guidelines

- Keep IAM permissions minimal — never add write access to CloudWatch, Cost Explorer, or Bedrock
- Never collect prompt content or model responses
- Update pricing data in both `models.ts` and `pricing.py` when adding models
- Add tests for new pricing calculations in `pricing.py`

## Reporting Issues

Please use GitHub Issues for bug reports and feature requests. Include:
- Steps to reproduce
- Expected vs actual behavior
- AWS region and CDK version