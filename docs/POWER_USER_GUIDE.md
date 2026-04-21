# Power User Guide

หน้านี้สำหรับคนที่ใช้ Analyzer, Graph, Rotation, Repair tool และ release gate จริงจัง

## Analyzer

ใช้ Analyzer เพื่อตอบคำถามพวกนี้:

- spawner ไหนอ้าง node ที่ไม่มี
- node ไหนไม่ได้ถูกใช้
- item ไหนโผล่บ่อยเกินไป
- ammo ต่อ weapon พอไหม
- medical share ต่ำเกินไปไหม
- node power score ตัวไหนแรงผิดปกติ

ถ้ามีปุ่มเปิดไฟล์จาก Analyzer ให้กดจากตรงนั้น เพราะจะพาไปไฟล์ที่เกี่ยวข้องโดยตรง

## Graph

Graph ใช้ดู flow `Spawner -> Node -> Item`

- ใช้ filter เพื่อลดจำนวน node
- คลิก node เพื่อดู neighborhood
- ใช้ zoom/pan เมื่อ graph ใหญ่

## Rotation

ใช้ Profiles/Rotation เมื่อมีหลายโหมด เช่น solo, pvp, hardcore หรือ event loot

หลักใช้งาน:

- สร้าง profile หลัง config ชุดนั้นพร้อมแล้ว
- ตั้ง rotation เฉพาะ profile ที่ test แล้ว
- ดู Activity หลัง run now

## Repair Tool

Dry-run ก่อนเสมอ:

```bash
npm run repair:loot-refs -- --dry-run
```

ถ้า output ดูถูกต้องค่อยรันจริง:

```bash
npm run repair:loot-refs
```

## Release Gate

ก่อนปล่อย build ให้คนอื่น:

```bash
npm run release:quality
```

คำสั่งนี้รวม test, release check, config roundtrip, sample workspace smoke test, docs link check และ changelog check
