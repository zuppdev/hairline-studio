# Security Policy

## Supported versions

Security fixes are made on the `main` branch and released in the next version. The hosted studio at <https://zuppdev.github.io/hairline-studio/> always runs the latest `main`.

## Scope

Hairline Studio runs entirely in the browser and has no server. Issues of particular interest are:

- content in an opened `.hairline.json` or exported `.html` file that can run script in the studio,
- figure data (such as the figure name) that can inject markup or script into an exported file,
- anything that causes the studio or an exported file to send data to a third party.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Describe the issue, how to reproduce it and its impact. A file that demonstrates the problem is very helpful.

You will receive an acknowledgement as soon as possible, normally within a week. Once a fix is available, it will be released and the advisory published with credit to the reporter, unless anonymity is requested.
