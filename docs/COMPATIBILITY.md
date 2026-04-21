# Compatibility Matrix

| Area | Supported / Tested |
| --- | --- |
| OS | Windows 10/11 เป็นเป้าหมายหลัก |
| Node.js | Node.js 18+ |
| Browser | Chromium-based browsers, Edge, Chrome |
| SCUM config root | โฟลเดอร์ `WindowsServer` ที่มีไฟล์หลักของ SCUM |
| Loot layout default | `Loot/Nodes/Current` และ `Loot/Spawners/Presets/Override` ใต้ config root |
| Loot layout custom | รองรับการตั้ง `Nodes folder` และ `Spawners folder` แยกเอง |
| Command wrappers | `.cmd`, `.bat`, `.ps1`, หรือ executable path ที่ผ่าน command sandbox |
| Online/SaaS mode | ยังไม่ใช่เป้าหมายรอบ local นี้ ต้องมี local agent/desktop bridge ถ้าจะให้เว็บออนไลน์แก้ไฟล์เครื่องลูกค้า |

ถ้าเครื่องอื่นใช้ไม่ได้ ให้เช็กตามนี้ก่อน:

1. Node.js ติดตั้งและเรียก `node -v` ได้
2. path ใน App Settings ชี้ไปที่เครื่องนั้นจริง
3. มีสิทธิ์ read/write ที่ config folder และ backup folder
4. Port 3000 ไม่ถูกโปรแกรมอื่นใช้
5. command reload/restart ผ่าน `Check command`
