# คู่มือติดตั้ง SETTING SERVER SCUM

ไฟล์นี้เขียนไว้สำหรับคนที่โหลดโปรเจกต์จาก GitHub แล้วอยากเปิดใช้งานบนเครื่องตัวเองแบบไม่ต้องเดาเยอะ

เครดิตโปรเจกต์: `KOGA.EXE`

## 1. เช็คของที่ต้องมี

ต้องมี:

- Windows 10/11 หรือ Windows Server
- Node.js 18 หรือใหม่กว่า
- โฟลเดอร์ config ของ SCUM server
- สิทธิ์อ่าน/เขียนไฟล์ในโฟลเดอร์ config และ backup

เช็ค Node.js ก่อน:

```powershell
node --version
npm --version
```

ถ้ายังไม่มี ให้ลง Node.js เวอร์ชัน LTS จาก:

```text
https://nodejs.org/
```

## 2. โหลดโปรเจกต์

ถ้าไม่ถนัด Git ให้กด `Code` ใน GitHub แล้วเลือก `Download ZIP`

แตกไฟล์ไว้ที่ไหนก็ได้ที่จำง่าย เช่น:

```text
C:\SETTING-SERVER-SCUM
```

ถ้าใช้ Git:

```powershell
git clone https://github.com/kogawz1997/SETTING-SERVER-SCUM.git
cd SETTING-SERVER-SCUM
```

## 3. ติดตั้ง dependency

เปิด PowerShell ในโฟลเดอร์โปรเจกต์ แล้วรัน:

```powershell
npm install
```

รอบแรกอาจใช้เวลาหน่อย เพราะต้องโหลด package ที่แอปใช้ หลังจากนั้นไม่ต้องรันใหม่ทุกครั้ง ยกเว้นอัปเดตโปรเจกต์

## 4. เปิดแอป

วิธีง่ายสุดบน Windows:

```text
ดับเบิลคลิก start-local.cmd
```

หรือใช้ PowerShell:

```powershell
npm start
```

แล้วเปิด browser ไปที่:

```text
http://localhost:3000
```

ถ้าเปิดไม่ได้ ให้เช็คว่า terminal ยังรันอยู่ และไม่มีโปรแกรมอื่นใช้ port `3000`

## 5. ตั้งค่า App Settings

เปิดหน้า `App Settings` แล้วใส่ path ให้ถูกก่อน อย่าเพิ่งไปแก้ loot ถ้ายังไม่ได้ตั้งตรงนี้

ค่าหลักที่ต้องใส่:

- `SCUM config folder`: โฟลเดอร์ config หลักของ SCUM server
- `Backup folder`: โฟลเดอร์สำหรับเก็บ backup
- `Nodes folder`: โฟลเดอร์ `Nodes` ถ้าไม่ได้อยู่ใต้ config root
- `Spawners folder`: โฟลเดอร์ `Spawners` ถ้าไม่ได้อยู่ใต้ config root
- `Reload loot command`: ใส่เฉพาะถ้ามี script reload ที่ทดสอบแล้ว
- `Restart server command`: ใส่เฉพาะถ้ามี script restart ที่ทดสอบแล้ว

ตัวอย่าง path:

```text
C:\scumserver\SCUM\Saved\Config\WindowsServer
```

โครงที่เจอบ่อย:

```text
WindowsServer/
  ServerSettings.ini
  GameUserSettings.ini
  EconomyOverride.json
  Nodes/
  Spawners/
```

หลังใส่ครบให้กด `Save App Config`

## 6. กด Preflight ก่อนแก้ไฟล์จริง

กลับไปหน้า `Dashboard` แล้วกด `Run Preflight`

ถ้าเจอ critical issue ให้แก้ก่อน เช่น:

- path config ผิด
- ไม่มีสิทธิ์อ่าน/เขียน
- หา `Nodes` หรือ `Spawners` ไม่เจอ
- JSON syntax ผิด
- loot อ้าง node ที่ไม่มีจริง

ถ้า Preflight ยังแดง อย่าเพิ่ง save ไฟล์ live

## 7. วิธีแก้ไฟล์แบบปลอดภัย

ลำดับที่แนะนำ:

1. เข้า `Backups`
2. สร้าง backup และใส่ tag เช่น `keep`
3. เข้า `Loot Studio` หรือ `Server Settings`
4. แก้เฉพาะส่วนที่ต้องการ
5. ดู validation
6. ถ้าแก้หลายจุด ให้กด `Preview Diff`
7. กด save
8. ทดสอบในเซิร์ฟเวอร์จริง

ถ้าแก้แล้วมีปัญหา ให้ restore เฉพาะไฟล์นั้นจากหน้า `Backups`

## 8. เรื่อง Reload / Restart

ปุ่ม `Save + Reload` และ `Restart Server` จะทำงานได้ก็ต่อเมื่อคุณตั้ง command เองใน `App Settings`

ตัวอย่าง wrapper script:

```bat
@echo off
REM ใส่คำสั่ง reload ของเซิร์ฟเวอร์คุณตรงนี้
call C:\scripts\reload_loot.bat
```

แนะนำให้ลองรัน script นั้นนอกแอปก่อน ถ้ารันนอกแอปยังไม่ผ่าน อย่าเอามาใส่ในแอป

## 9. คำสั่งตรวจโปรเจกต์

ตรวจว่าไฟล์สำคัญยังครบ:

```powershell
npm run release:check
```

รัน test:

```powershell
npm test
```

ถ้า test ฟ้องเรื่อง Playwright browser ให้ติดตั้งตามข้อความ error ที่แสดง

## 10. ปัญหาที่เจอบ่อย

### เปิดเว็บไม่ได้

เช็คว่า `npm start` ยังรันอยู่ และ port `3000` ไม่โดนโปรแกรมอื่นใช้

### Save ไม่ได้

ส่วนใหญ่เป็น permission ให้เช็คว่า user ที่รันแอปเขียนไฟล์ใน config folder และ backup folder ได้

### หา Nodes / Spawners ไม่เจอ

ไปหน้า `App Settings` แล้วตั้ง `Nodes folder` กับ `Spawners folder` ให้ชี้ไปที่โฟลเดอร์จริง

### Icon item ไม่ขึ้น

เช็คว่าโฟลเดอร์ `scum_items-main` ยังอยู่ครบในโปรเจกต์

### Analyzer บอก unused node

อย่าลบทันที ให้ค้นใน Graph/Search ก่อน บาง node อาจเป็น node พิเศษหรือ standalone

## 11. เวลาอัปเดตเวอร์ชันใหม่

ถ้าโหลด ZIP ใหม่:

1. ปิด server/app เดิมก่อน
2. backup โฟลเดอร์ `data` ของเครื่องตัวเอง
3. แตก ZIP ใหม่
4. คัดลอก config เฉพาะที่จำเป็นกลับมา
5. รัน `npm install`
6. รัน `npm run release:check`
7. เปิดแอปใหม่

อย่าเขียนทับ `data/config.json` ของเครื่องจริงโดยไม่ backup เพราะไฟล์นี้เก็บ path เฉพาะเครื่อง
