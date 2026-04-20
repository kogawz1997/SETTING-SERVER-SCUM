# SETTING SERVER SCUM

เว็บเครื่องมือแบบ local-first สำหรับจัดการไฟล์ตั้งค่าเซิร์ฟเวอร์ SCUM, loot, backup, profile, rotation และตรวจสอบความผิดพลาดก่อนนำไปใช้จริง

โปรเจกต์นี้ออกแบบมาเพื่อให้คนดูแลเซิร์ฟเวอร์ไม่ต้องแก้ JSON/INI แบบดิบทั้งหมดเอง มีหน้าเว็บช่วยแบ่งหมวดหมู่ ตรวจ validation ทำ backup ก่อน save และช่วยให้การปรับ loot เข้าใจง่ายขึ้น

![Dashboard](docs/assets/dashboard.png)

## ลิงก์เริ่มต้น

- คู่มือติดตั้งภาษาไทย: `docs/INSTALL_TH.md`
- คู่มือใช้งาน: `docs/USAGE_GUIDE.md`
- Checklist ก่อนส่งต่อหรือใช้งานจริง: `docs/RELEASE_CHECKLIST.md`

## สถานะโปรเจกต์

เวอร์ชันปัจจุบันอยู่ในระดับ `P2.3`

ระบบใช้งานจริงแบบ local ได้แล้ว เหมาะสำหรับเปิดบนเครื่องที่มีไฟล์ config ของ SCUM server หรือเครื่องแอดมินที่ map path ไปยังโฟลเดอร์ config ได้

## ฟีเจอร์หลัก

- Dashboard สำหรับดูสถานะระบบและรัน Preflight ก่อนใช้งาน
- App Settings สำหรับตั้ง path หลัก, backup folder, Nodes folder, Spawners folder และคำสั่ง reload/restart
- Server Settings editor สำหรับ `ServerSettings.ini` แบบแยกหมวดหมู่ ใช้ง่ายกว่าเปิดไฟล์ดิบ
- Core Files editor สำหรับ `GameUserSettings.ini` และ `EconomyOverride.json`
- Loot Studio สำหรับเปิด แก้ เพิ่ม ลบ clone และ save ไฟล์ `Nodes/*.json` กับ `Spawners/*.json`
- Loot Builder แบบ visual ช่วยปรับ item, probability, quick add, normalize, template และ autocomplete
- Item Catalog พร้อม icon matching จากชุดไฟล์ `scum_items-main`
- Analyzer สำหรับตรวจ nodes, spawners, missing refs, unused nodes, item ที่ใช้บ่อย และภาพรวม balance
- Graph สำหรับดูความสัมพันธ์ `Spawner -> Node -> Item`
- Global Search สำหรับค้น item, node, spawner และข้อความในไฟล์ทั้งระบบ
- Auto-Fix preview สำหรับแก้โครง JSON พื้นฐานก่อน apply จริง
- Backup / Restore พร้อม note, tag, compare, cleanup preview และ restore รายไฟล์
- Profiles / Rotation สำหรับบันทึกชุด config และสลับใช้งาน
- Activity log สำหรับดูประวัติ save, backup, restore, command และ profile action
- Thai / English UI toggle จากแถบด้านบน

## ต้องมีอะไรก่อนใช้งาน

- Node.js 18 หรือใหม่กว่า
- โฟลเดอร์ config ของ SCUM server
- Windows แนะนำให้ใช้ `start-local.cmd` หรือ `start-local.ps1`
- ถ้าจะใช้ปุ่ม reload/restart ต้องมี script หรือ command ของเซิร์ฟเวอร์ตัวเองก่อน

ตัวอย่าง path ของ SCUM config:

```text
C:\scumserver\SCUM\Saved\Config\WindowsServer
```

โครงไฟล์ที่ระบบคาดหวัง:

```text
WindowsServer/
  ServerSettings.ini
  GameUserSettings.ini
  EconomyOverride.json
  Nodes/
  Spawners/
```

## วิธีติดตั้ง

เปิด terminal ในโฟลเดอร์โปรเจกต์ แล้วรัน:

```bash
npm install
npm start
```

จากนั้นเปิดเว็บ:

```text
http://localhost:3000
```

บน Windows สามารถเปิดแบบง่ายได้ด้วยการดับเบิลคลิก:

```text
start-local.cmd
```

หรือคลิกขวา PowerShell แล้วรัน:

```powershell
.\start-local.ps1
```

## วิธีตั้งค่าครั้งแรก

1. เปิดหน้า `App Settings`
2. ใส่ `SCUM config folder` ให้ชี้ไปยังโฟลเดอร์ config จริงของเซิร์ฟเวอร์
3. ใส่ `Backup folder` สำหรับเก็บไฟล์สำรอง
4. ใส่ `Nodes folder` และ `Spawners folder` ถ้าไฟล์ loot อยู่คนละ path กับค่า default
5. ใส่ `Reload loot command` ถ้ามี script reload loot
6. ใส่ `Restart server command` ถ้ามี script restart server
7. กด `Save App Config`
8. กลับไปหน้า `Dashboard`
9. กด `Run Preflight`
10. ถ้า Preflight ไม่มี critical issue ค่อยเริ่มแก้ไฟล์จริง

## วิธีใช้งานแต่ละหน้า

### Dashboard

ใช้ดูภาพรวมระบบ, readiness score, quick start checklist, ปุ่ม backup/reload/restart และ global search

### App Settings

ใช้ตั้ง path ที่แอปต้องใช้ เช่น config folder, backup folder, nodes folder, spawners folder และ command สำหรับ reload/restart

### Server Settings

ใช้แก้ `ServerSettings.ini` แบบเป็นช่อง input/dropdown ไม่ต้องแก้ไฟล์ดิบทั้งหมดเอง เหมาะกับค่าที่เป็นตัวเลข ข้อความ และค่า `True/False`

### Core Files

ใช้แก้ `GameUserSettings.ini` และ `EconomyOverride.json` พร้อม validation และ diff preview ก่อน save

### Loot Studio

ใช้จัดการ loot หลักของเซิร์ฟเวอร์ เลือกไฟล์ node/spawner จาก sidebar แล้วแก้ผ่าน builder หรือ raw JSON ได้

สิ่งที่แนะนำใน Loot Studio:

- ใช้ช่อง search เพื่อหาไฟล์หรือ item ก่อน
- ใช้ item catalog/autocomplete แทนการพิมพ์ class name เอง
- ดู validation ก่อน save ทุกครั้ง
- ใช้ Preview Diff ถ้าแก้หลายรายการ
- ใช้ Save + Reload เฉพาะตอนตั้ง reload command ถูกแล้ว

### Analyzer

ใช้ตรวจปัญหา loot เช่น node ที่ไม่ได้ใช้, spawner ที่อ้าง node หาย, item ซ้ำบ่อย และ balance คร่าวๆ ของ weapon/ammo/medical/other

### Graph

ใช้ดู flow ความสัมพันธ์ของ loot ว่า spawner ไหนเรียก node ไหน และ node นั้นมี item อะไร

### Profiles

ใช้บันทึก snapshot ของ config และ apply กลับภายหลัง เหมาะกับทำชุด config หลายแบบ เช่น solo, pvp, hardcore

### Backups

ใช้ดู backup, ใส่ note/tag, compare backup, cleanup backup เก่า และ restore เฉพาะไฟล์ที่ต้องการ

### Activity

ใช้ดูประวัติการทำงาน เช่น save, backup, restore, apply profile และ command ที่เคยรัน

## ระบบกันพัง

- สร้าง backup ก่อนเขียนไฟล์
- block JSON ที่ syntax ผิด
- block INI ที่ malformed
- ตรวจ missing refs ใน loot
- ตรวจ probability ที่ผิดปกติ
- มี diff preview ก่อน save
- restore กลับเป็นรายไฟล์ได้
- มี release check สำหรับตรวจความพร้อมก่อนส่งต่อ

## คำสั่งที่ใช้บ่อย

ติดตั้ง dependency:

```bash
npm install
```

เปิดใช้งาน:

```bash
npm start
```

รัน test:

```bash
npm test
```

ตรวจความพร้อมก่อน release:

```bash
npm run release:check
```

ตรวจ case-sensitive loot refs แบบ preview:

```bash
npm run repair:loot-refs -- --dry-run
```

ซ่อม case-sensitive loot refs:

```bash
npm run repair:loot-refs
```

## ข้อควรระวัง

- อย่าแก้ไฟล์จริงโดยไม่สร้าง backup ก่อน
- อย่ากด Save + Reload ถ้ายังไม่ได้ตั้ง reload command
- อย่าลบ node ที่ Analyzer บอกว่า unused ทันที ให้เช็คก่อนว่าเป็น node พิเศษหรือ standalone หรือไม่
- เว็บออนไลน์ทั่วไปไม่สามารถแก้ไฟล์ในเครื่องลูกค้าได้โดยตรง ต้องมี local agent หรือ desktop bridge ช่วย
- ถ้าเอาไปใช้กับหลายเครื่อง ควรตั้ง path ใหม่ใน `App Settings` ทุกเครื่อง

## โฟลเดอร์สำคัญ

```text
public/                 หน้าเว็บและ UI
server.js               backend local server
data/                   config ตัวอย่าง, profile, rotation, catalog override
docs/                   เอกสารใช้งานและสถานะโปรเจกต์
scripts/                test, release check, repair tool และ command wrapper
scum_items-main/        item catalog และ icon assets
```

## เอกสารเพิ่มเติม

- `docs/USAGE_GUIDE.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/P2_3_STATUS.md`
- `docs/SAAS_TENANT_ARCHITECTURE.md`

## English Summary

`SETTING SERVER SCUM` is a local-first web control panel for SCUM server configuration and loot management. It provides editors, validation, backups, profiles, item catalog icons, loot analysis, dependency graph, search, and safe apply workflows for local server administrators.
