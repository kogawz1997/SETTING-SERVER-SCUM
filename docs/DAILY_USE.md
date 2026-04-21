# Daily Use

ลำดับใช้งานประจำวันควรเป็นแบบนี้

1. เปิดด้วย `start-local.cmd`
2. ดู `Dashboard` ก่อนว่ามี critical issue ไหม
3. กดสร้าง backup ถ้าจะทำงานกับไฟล์จริง
4. เปิด `Server Settings` หรือ `Loot Studio`
5. แก้เฉพาะส่วนที่ตั้งใจแก้
6. ดู validation และ diff ก่อน save
7. กด save
8. ถ้าตั้ง reload command ไว้แล้วค่อยกด reload
9. ดู `Activity` ว่ามี event save/backup/restore ถูกบันทึก

หลักสำคัญคืออย่าแก้หลายเรื่องพร้อมกันถ้ายังไม่มั่นใจ เพราะ diff และ restore จะอ่านง่ายขึ้นเมื่อหนึ่งรอบงานมีเป้าหมายเดียว

สำหรับ Loot Studio:

- ใช้ `Visual Builder` ถ้าต้องแก้ item, probability, node group หรือ ref
- ใช้ `Split View` ถ้าอยากเห็น JSON ดิบคู่กับ builder
- ใช้ `Raw JSON` เฉพาะเวลารู้โครงไฟล์แน่แล้ว
- ใช้ search/filter ก่อนแก้ไฟล์ยาว
- ใช้ bulk edit กับไฟล์ที่มี item เยอะ

อ่านต่อ:

- [Power User Guide](POWER_USER_GUIDE.md)
- [Recovery Guide](RECOVERY_GUIDE.md)
