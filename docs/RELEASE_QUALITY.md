# Release Quality

เป้าหมายคือกันไม่ให้ build ที่ปล่อยให้คนอื่นใช้มีปัญหาพื้นฐาน

คำสั่งหลัก:

```bash
npm run release:quality
```

สิ่งที่เช็ก:

- syntax/basic checks
- release file checks
- config/package roundtrip แบบ portable
- sample workspace smoke test
- large generated workspace performance smoke test
- docs broken-link check
- changelog/version check
- full test suite
- portable package build via `npm run package:portable`
- portable package manifest/private-file smoke via `npm run package:portable:smoke`
- release zip extract smoke via `npm run package:portable:zip-smoke`

Portable package command:

```bash
npm run package:portable
```

Output folder:

```text
dist/SETTING-SERVER-SCUM-local
```

Give users the folder and tell them to double-click `Start SETTING SERVER SCUM.exe`. If Windows blocks the EXE, use `Start SETTING SERVER SCUM.cmd` as the fallback.

GitHub release automation:

- Push a tag like `v1.0.2-local`.
- `.github/workflows/local-portable-release.yml` builds the portable folder, creates `SETTING-SERVER-SCUM-<tag>.zip`, and publishes a GitHub Release with that zip attached.
- The workflow uses GitHub-hosted `gh release` with `GITHUB_TOKEN`, so the local machine does not need `gh` CLI for tag-based releases.
- The workflow pins `actions/checkout@v5`, `actions/setup-node@v5`, and Node.js 22 for release verification.

ถ้าอยาก bump version:

```bash
npm run version:bump -- --patch --note="Short release note"
```

หลัง bump version ให้รัน:

```bash
npm run release:quality
```

ถ้า release gate ตก อย่าปล่อย build นั้น ให้แก้จุดที่ fail ก่อน
