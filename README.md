# SETTING SERVER SCUM

เครื่องมือจัดการไฟล์ตั้งค่าและระบบ Loot ของ SCUM server แบบ local-first สำหรับคนที่อยากแก้ `INI` / `JSON` ให้ง่ายขึ้น เห็นผลก่อน save และมีทางกู้กลับถ้าแก้พลาด

เครดิตโปรเจกต์: `KOGA.EXE`

## สถานะล่าสุด

- เวอร์ชันล่าสุด: `v1.0.6-local`
- ระดับโปรเจกต์: `P2.13 local-ready` พร้อม patch readiness ล่าสุด
- GitHub Release ล่าสุด: [SETTING SERVER SCUM v1.0.6-local](https://github.com/kogawz1997/scum-server-config-manager/releases/tag/v1.0.6-local)
- ไฟล์ portable: `SETTING-SERVER-SCUM-v1.0.6-local.zip`
- Release notes: [docs/releases/v1.0.6-local.md](docs/releases/v1.0.6-local.md)

รอบ `v1.0.6-local` เพิ่มของสำคัญสำหรับการใช้งานจริง: Startup Doctor, operation log แบบ JSONL, support bundle ที่แนบ log ล่าสุด, test UI แบบเปิด server แยกเองไม่ชน port เก่า และแก้ bug save kit template ใน Loot Studio

![Dashboard](docs/assets/dashboard.png)

## ใช้งานแบบ Portable

เหมาะกับคนที่ไม่อยากเปิด terminal หรือใช้ `npm` เอง

1. ไปหน้า [Latest Release](https://github.com/kogawz1997/scum-server-config-manager/releases/latest)
2. ดาวน์โหลด `SETTING-SERVER-SCUM-v1.0.6-local.zip`
3. แตกไฟล์ zip
4. ดับเบิลคลิก `Start SETTING SERVER SCUM.exe`
5. ถ้า Windows block ไฟล์ `.exe` ให้ใช้ `Start SETTING SERVER SCUM.cmd`
6. เปิด Dashboard แล้วดู Startup Doctor / Preflight ก่อนแก้ไฟล์จริง

ตัว launcher จะช่วยเช็ก Node.js, ติดตั้ง dependency ที่ขาด, หา port ว่าง, เปิด local server, เขียน `logs/startup.log` และเปิด browser ให้อัตโนมัติ

## ใช้งานจาก Source

ต้องมี Node.js 18 หรือใหม่กว่า

```powershell
npm install
npm start
```

แล้วเปิด:

```text
http://localhost:3000
```

บน Windows สามารถดับเบิลคลิกไฟล์นี้ได้:

```text
start-local.cmd
```

## วิธีตั้งค่าครั้งแรก

เข้า `App Settings` แล้วตั้ง path ให้ครบก่อนแก้ไฟล์จริง

- `SCUM config folder`: โฟลเดอร์ config หลักของ SCUM server
- `Backup folder`: โฟลเดอร์เก็บ backup
- `Nodes folder`: โฟลเดอร์ `Nodes` ถ้าไม่ได้อยู่ใต้ config root
- `Spawners folder`: โฟลเดอร์ `Spawners` ถ้าไม่ได้อยู่ใต้ config root
- `Reload loot command`: ใส่เฉพาะถ้ามี script reload ที่ทดสอบแล้ว
- `Restart server command`: ใส่เฉพาะถ้ามี script restart ที่ทดสอบแล้ว

ตัวอย่าง path ที่เจอบ่อย:

```text
C:\scumserver\SCUM\Saved\Config\WindowsServer
```

โครงไฟล์ที่ระบบคาดหวังโดยทั่วไป:

```text
WindowsServer/
  ServerSettings.ini
  GameUserSettings.ini
  EconomyOverride.json
  Nodes/
  Spawners/
```

ถ้า `Nodes` หรือ `Spawners` อยู่คนละที่ ให้ชี้ path เองใน `App Settings`

## หน้าในระบบ

- `/dashboard`: ภาพรวมระบบ, Startup Doctor, Preflight, quick actions
- `/settings`: ตั้งค่า path, backup folder, reload/restart command และ setup wizard แบบพับได้
- `/server-settings`: แก้ `ServerSettings.ini` แบบแบ่งหมวด มี dropdown/filter และ True/False เป็นตัวเลือก
- `/core-files`: แก้ `GameUserSettings.ini` และ `EconomyOverride.json`
- `/loot-studio`: แก้ `Nodes/*.json` และ `Spawners/*.json`
- `/analyzer`: วิเคราะห์ loot/config, missing refs, unused nodes, balance และคำแนะนำ
- `/graph`: ดูความสัมพันธ์ `Spawner -> Node -> Item` และแก้ spawner refs แบบ preview/apply
- `/backups`: backup, restore, compare, cleanup
- `/profiles`: snapshot/profile/rotation
- `/help`: คู่มือใช้งานในแอป
- `/customer-ready`: หน้าเดียวสำหรับเช็กก่อนส่งให้คนอื่นใช้

## Loot Studio ทำอะไรได้

Loot Studio ถูกทำให้คนที่ไม่อยากแก้ JSON ดิบใช้ง่ายขึ้น

- แยกโหมด `Visual Builder`, `Split View`, `Raw JSON`
- ค้นหาและเปิดไฟล์ Nodes/Spawners ได้เร็ว
- มี quick access สำหรับไฟล์ที่ปักหมุดและไฟล์ที่เปิดล่าสุด
- แก้ item แบบแถวได้ เพิ่ม/ลบ/clone/reorder
- ปรับ probability, normalize, ใช้ preset probability และ bulk edit
- มี item autocomplete พร้อม icon
- มี item catalog จาก `scum_items-main` พร้อมชื่อไทย/อังกฤษ, หมวด, rarity, tag และ icon
- มี kit template สำหรับบันทึกชุด item แล้วเอากลับมาใช้ซ้ำ
- มี simulator แบบ deterministic สำหรับเทียบ draft กับไฟล์ที่ save แล้ว
- มี autofix preview และ quick fix สำหรับเคสพื้นฐาน

## ระบบกันพัง

โปรเจกต์นี้แตะไฟล์จริง จึงมีชั้นป้องกันหลายจุด

- backup ก่อน save/apply ใน flow เสี่ยง
- diff preview ก่อนเขียนไฟล์
- validation สำหรับ INI/JSON/loot refs
- dry-run / safe apply
- rollback ตอน transaction เขียนหลายไฟล์แล้วล้ม
- command sandbox สำหรับ reload/restart
- activity log สำหรับดูประวัติ action
- operation log ที่ `logs/operations.jsonl`
- support bundle สำหรับ export config/log/diagnostics แบบไม่ติด path ส่วนตัว

คำแนะนำตรงๆ: ก่อนแก้ server จริง ให้สร้าง backup ก่อนเสมอ และอย่ากด reload/restart ถ้ายังไม่ได้ทดสอบ command นอกแอป

## Startup Doctor

`v1.0.6-local` เพิ่ม Startup Doctor เพื่อบอกเป็นภาษาคนว่าเครื่องนี้พร้อมใช้แค่ไหน

มันจะเช็ก:

- โฟลเดอร์ config หลัก
- `Nodes folder`
- `Spawners folder`
- backup folder
- สิทธิ์อ่าน/เขียน
- reload/restart command
- ไฟล์หลัก เช่น `ServerSettings.ini`, `GameUserSettings.ini`, `EconomyOverride.json`

ถ้ายังมีจุดเสี่ยง ระบบจะบอกว่าควรแก้อะไรก่อน ไม่ใช่ปล่อยให้ user เดาเอง

## Quality Gate

ก่อนปล่อย build ให้คนอื่นใช้ ให้รัน:

```powershell
npm run release:quality
```

ชุดนี้จะตรวจ:

- basic checks
- release checks
- config roundtrip
- sample workspace smoke test
- performance smoke
- docs link check
- changelog check
- portable package build
- unit/integration/UI/regression tests

คำสั่งแยกที่ใช้บ่อย:

```powershell
npm test
npm run release:check
npm run package:portable
npm run repair:loot-refs -- --dry-run
```

## Release ล่าสุดที่ตรวจผ่าน

ก่อนปล่อย `v1.0.6-local` ตรวจผ่านแล้ว:

- Unit: `17/17`
- Integration: `9/9`
- UI smoke: `15/15`
- Loot regression: `19/19`
- Settings regression: `4/4`
- Backup activity: `2/2`
- `npm run release:quality`: ผ่าน

## เอกสารเพิ่มเติม

- [Quick Start](docs/QUICK_START.md)
- [Install TH](docs/INSTALL_TH.md)
- [Daily Use](docs/DAILY_USE.md)
- [Recovery Guide](docs/RECOVERY_GUIDE.md)
- [Power User Guide](docs/POWER_USER_GUIDE.md)
- [Compatibility](docs/COMPATIBILITY.md)
- [Release Quality](docs/RELEASE_QUALITY.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [P2.13 Status](docs/P2_3_STATUS.md)
- [Changelog](CHANGELOG.md)

## ขอบเขตที่ยังเป็นอนาคต

รอบนี้ปิดงานฝั่ง local/portable เป็นหลัก ยังไม่รวม SaaS หรือ remote agent

- hosted multi-tenant SaaS
- local agent installer สำหรับ remote apply
- auth/tenant permissions
- goal-based tuning / AI-assisted proposals
- graph editor แบบลากแก้ทุก relationship เต็มระบบ
- simulator ที่จำลอง runtime SCUM ได้เป๊ะ 100%
