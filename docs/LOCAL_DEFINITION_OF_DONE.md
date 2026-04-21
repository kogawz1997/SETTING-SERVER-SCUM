# Local Definition Of Done

นับว่า local build พร้อมส่งต่อเมื่อครบเงื่อนไขนี้

- ติดตั้งได้ด้วย `npm install`
- เปิดได้ด้วย `start-local.cmd` หรือ `npm start`
- ตั้งค่าครั้งแรกได้จาก App Settings โดยไม่ต้องเดา path เองทั้งหมด
- sample workspace เปิดใช้ได้โดยไม่แตะไฟล์จริง
- backup/restore รายไฟล์ใช้งานได้
- save มี diff/validation ก่อนเขียนไฟล์
- Analyzer/Search/Graph ชี้ปัญหาและเปิดไฟล์ที่เกี่ยวข้องได้
- package export เป็น portable ได้โดยไม่ติด path เครื่องเดิม
- import package แล้ว remap path ใหม่ได้
- `npm test` ผ่าน
- `npm run release:quality` ผ่าน
- README และ docs ไม่มีลิงก์เสีย
- CHANGELOG มี entry ตรงกับ version ใน `package.json`
- Recovery Guide อธิบายกู้ไฟล์เสียได้เอง
