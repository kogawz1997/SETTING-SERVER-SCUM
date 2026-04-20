# คู่มือติดตั้ง SETTING SERVER SCUM

เอกสารนี้สำหรับคนที่ต้องการโหลดโปรเจกต์จาก GitHub แล้วเปิดใช้งานบนเครื่อง Windows เพื่อจัดการไฟล์ตั้งค่าเซิร์ฟเวอร์ SCUM แบบ local

เครดิตโปรเจกต์: `KOGA.EXE`

## 1. สิ่งที่ต้องมี

- Windows 10/11 หรือ Windows Server
- Node.js เวอร์ชัน 18 หรือใหม่กว่า
- ไฟล์ config ของ SCUM server อยู่ในเครื่อง หรืออยู่ใน path ที่เครื่องนี้เข้าถึงได้
- สิทธิ์อ่าน/เขียนในโฟลเดอร์ config และ backup

เช็ค Node.js:

```powershell
node --version
npm --version
```

ถ้ายังไม่มี Node.js ให้ติดตั้งจาก:

```text
https://nodejs.org/
```

แนะนำให้ลงเวอร์ชัน LTS

## 2. โหลดโปรเจกต์

วิธีง่ายสุดคือกดปุ่ม `Code` ใน GitHub แล้วเลือก `Download ZIP`

แตกไฟล์ไปไว้ เช่น:

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

ขั้นตอนนี้ต้องทำครั้งแรกครั้งเดียว หรือทำใหม่เมื่อมีการอัปเดต dependency

## 4. เปิดใช้งาน

วิธีที่ง่ายที่สุด:

```text
ดับเบิลคลิก start-local.cmd
```

หรือรันผ่าน PowerShell:

```powershell
npm start
```

จากนั้นเปิด browser ไปที่:

```text
http://localhost:3000
```

## 5. ตั้งค่า App Settings ครั้งแรก

เปิดหน้า `App Settings` แล้วกรอกค่าหลัก:

- `SCUM config folder`: โฟลเดอร์ config หลักของ SCUM server
- `Backup folder`: โฟลเดอร์เก็บ backup
- `Nodes folder`: โฟลเดอร์ `Nodes` ถ้าไม่ได้อยู่ใต้ config root
- `Spawners folder`: โฟลเดอร์ `Spawners` ถ้าไม่ได้อยู่ใต้ config root
- `Reload loot command`: คำสั่ง reload loot ถ้ามี
- `Restart server command`: คำสั่ง restart server ถ้ามี

ตัวอย่าง config folder:

```text
C:\scumserver\SCUM\Saved\Config\WindowsServer
```

ตัวอย่างโครงไฟล์:

```text
WindowsServer/
  ServerSettings.ini
  GameUserSettings.ini
  EconomyOverride.json
  Nodes/
  Spawners/
```

หลังกรอกเสร็จ กด `Save App Config`

## 6. ตรวจความพร้อมก่อนแก้ไฟล์จริง

กลับไปหน้า `Dashboard` แล้วกด `Run Preflight`

ถ้าเจอ critical issue ให้แก้ก่อน เช่น:

- path config ไม่ถูก
- ไม่มีสิทธิ์อ่าน/เขียน
- หา `Nodes` หรือ `Spawners` ไม่เจอ
- loot มี missing references
- JSON syntax ผิด

ถ้า Preflight ผ่าน ค่อยเริ่มแก้ไฟล์จริง

## 7. วิธีใช้งานแบบปลอดภัย

ก่อนแก้ไฟล์ live แนะนำลำดับนี้:

1. เปิดหน้า `Backups`
2. สร้าง backup และใส่ tag เช่น `keep`
3. เปิดหน้า `Loot Studio` หรือ `Server Settings`
4. แก้ข้อมูลที่ต้องการ
5. ดู validation ก่อน save
6. ใช้ `Preview Diff` ถ้าแก้หลายจุด
7. กด save
8. ทดสอบในเซิร์ฟเวอร์จริง

ถ้าเกิดปัญหา ให้เปิด `Backups` แล้ว restore เฉพาะไฟล์ที่ต้องการ

## 8. การตั้งค่า Reload/Restart

ปุ่ม `Save + Reload` หรือ `Restart Server` จะทำงานได้ก็ต่อเมื่อคุณตั้ง command เองใน `App Settings`

ตัวอย่าง wrapper script:

```bat
@echo off
REM ใส่คำสั่ง reload ของเซิร์ฟเวอร์คุณตรงนี้
call C:\scripts\reload_loot.bat
```

จากนั้นใส่ path script ใน `Reload loot command`

อย่ากด reload/restart ถ้ายังไม่ได้ทดสอบ command นั้นนอกแอปก่อน

## 9. คำสั่งสำหรับตรวจโปรเจกต์

รันตรวจพื้นฐาน:

```powershell
npm run release:check
```

รัน test ทั้งหมด:

```powershell
npm test
```

ถ้าเครื่องยังไม่มี Playwright browser อาจต้องติดตั้งเพิ่มตาม error ที่ npm แสดง

## 10. ปัญหาที่พบบ่อย

### เปิดเว็บไม่ได้

เช็คว่า terminal ยังรัน `npm start` อยู่หรือไม่ และ port `3000` ไม่ถูกโปรแกรมอื่นใช้

### Save ไม่ได้

เช็คสิทธิ์เขียนไฟล์ใน config folder และ backup folder

### หา Nodes/Spawners ไม่เจอ

ไปหน้า `App Settings` แล้วตั้ง `Nodes folder` กับ `Spawners folder` ให้ถูก path

### Icon item ไม่ขึ้น

เช็คว่าโฟลเดอร์ `scum_items-main` ยังอยู่ในโปรเจกต์ และไฟล์ catalog ยังครบ

### Analyzer บอก unused node

อย่าลบทันที บาง node อาจเป็น standalone หรือเป็น node พิเศษ ให้ตรวจใน Graph/Search ก่อน

## 11. อัปเดตเวอร์ชันใหม่

ถ้าโหลด ZIP ใหม่:

1. ปิด server เดิม
2. backup โฟลเดอร์ `data` ของเครื่องตัวเองก่อน
3. แตก ZIP เวอร์ชันใหม่
4. คัดลอก config เฉพาะที่ต้องใช้กลับมา
5. รัน `npm install`
6. รัน `npm run release:check`
7. เปิดใช้งานใหม่

ห้ามเขียนทับ `data/config.json` ของเครื่องจริงโดยไม่ backup
