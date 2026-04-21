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
- portable package smoke via `npm run package:portable`

Portable package command:

```bash
npm run package:portable
```

Output folder:

```text
dist/SETTING-SERVER-SCUM-local
```

Give users the folder and tell them to double-click `Start SETTING SERVER SCUM.cmd`.

GitHub release automation:

- Push a tag like `v1.0.2-local`.
- `.github/workflows/local-portable-release.yml` builds the portable folder, creates `SETTING-SERVER-SCUM-<tag>.zip`, and publishes a GitHub Release with that zip attached.
- The workflow uses `GITHUB_TOKEN` inside GitHub Actions, so the local machine does not need `gh` CLI.

ถ้าอยาก bump version:

```bash
npm run version:bump -- --patch --note="Short release note"
```

หลัง bump version ให้รัน:

```bash
npm run release:quality
```

ถ้า release gate ตก อย่าปล่อย build นั้น ให้แก้จุดที่ fail ก่อน
