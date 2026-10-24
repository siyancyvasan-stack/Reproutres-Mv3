# Android release artifacts

Store verified Android release artifacts in this directory when they are ready for distribution.

Do not commit debug APKs, unsigned APKs, keystores, passwords, or generated build caches. A production APK must be built with the EAS-managed release credentials, verified with `apksigner`, and recorded in the release notes with its SHA-256 checksum before it is published.

The current build command is:

```bash
npx eas-cli build --profile production-apk --platform android
```
