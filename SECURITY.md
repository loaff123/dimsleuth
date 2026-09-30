# Security and privacy

## Boundary

Formula input is parsed as a small, explicit language. It is never executed as JavaScript. The analysis core has no network, filesystem, or runtime dependencies. Browser formula data is not sent to any server by application code. Hosting platforms may perform their own access control and request logging.

Limits bound formula length, token count, parser nesting, symbols, unit strings, exact arithmetic, and project JSON. The JSON importer accepts only the v1 shape and rejects dangerous property names. HTML reports escape user content and carry a restrictive policy with no scripts or external assets. Browser downloads are user-triggered.

Local draft storage is opt-in. Do not enable it on a shared device if your formulas are confidential. Clear saved data using the in-app control. Language preference is also stored locally. Exported projects and reports contain the user's formulas and unit definitions; handle those files accordingly.

## Report a problem

For a vulnerability, do not publish confidential formulas, credentials, or weaponized payloads in an issue. Use the repository's private vulnerability reporting channel if it is enabled. If unavailable, open a minimal issue asking the maintainer for a private contact route without including exploit details.

This is not a numerical safety verifier. Do not rely on dimensional consistency as evidence that an engineering or medical calculation is safe, physically correct, or suitable for production.
