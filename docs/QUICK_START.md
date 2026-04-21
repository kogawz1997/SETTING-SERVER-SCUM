# Quick Start

เป้าหมายของหน้านี้คือเปิดใช้ได้ใน 5 นาทีโดยไม่แตะไฟล์จริงแบบเสี่ยงเกินไป

1. ติดตั้ง dependency ด้วย `npm install`
2. เปิดแอปด้วย `start-local.cmd` หรือ `npm start`
3. เข้า `http://localhost:3000`
4. ไปที่ `App Settings`
5. ถ้ายังไม่มีไฟล์จริงให้กดใช้ sample workspace หรือชี้ `SCUM config folder` ไปที่ `samples/scum-workspace/WindowsServer`
6. กด `Check folder`
7. กลับไป `Dashboard` แล้วดู Preflight ก่อนเริ่มแก้ไฟล์

ถ้าจะใช้กับเซิร์ฟเวอร์จริง ให้ชี้ path ไปที่โฟลเดอร์ `WindowsServer` ที่มี `ServerSettings.ini`, `GameUserSettings.ini`, `EconomyOverride.json`, `Loot/Nodes/Current`, และ `Loot/Spawners/Presets/Override`

คำสั่งก่อนปล่อย build ให้คนอื่น:

```bash
npm run release:quality
```

อ่านต่อ:

- [Daily Use](DAILY_USE.md)
- [Recovery Guide](RECOVERY_GUIDE.md)
- [Compatibility](COMPATIBILITY.md)
