# คู่มือใช้งาน

คู่มือนี้อธิบายว่าแต่ละหน้ามีไว้ทำอะไร และควรใช้ลำดับไหนเวลาจะยุ่งกับไฟล์เซิร์ฟเวอร์จริง

## เริ่มแบบปลอดภัย

ถ้าเพิ่งเริ่มใช้กับเซิร์ฟจริง ให้ทำตามนี้ก่อน:

1. ไปหน้า `App Settings` แล้วตั้ง path ให้ถูก
2. ตั้ง `Nodes folder` และ `Spawners folder` ถ้าไม่ได้อยู่ใต้ config root
3. กลับไป `Dashboard` แล้วกด `Run Preflight`
4. ไปหน้า `Backups` แล้วสร้าง backup ใส่ tag เช่น `keep`
5. เข้า `Loot Studio` แล้วแก้ผ่าน visual builder ก่อน อย่าเริ่มจาก raw JSON ถ้ายังไม่ชัวร์
6. ดู validation ก่อน save ทุกครั้ง
7. ถ้าแก้เยอะ ให้กด `Preview Diff`
8. ใช้ `Save + Reload` เฉพาะตอนตั้ง reload command ถูกแล้ว
9. ถ้ามีปัญหา ให้ restore เฉพาะไฟล์ที่เสียจากหน้า `Backups`
10. ก่อนส่งต่อให้เครื่องอื่น รัน `npm run release:check` และ `npm test`

## Dashboard

หน้านี้เอาไว้ดูภาพรวม ไม่ต้องเดาว่าระบบพร้อมหรือยัง

ใช้เช็ค:

- config folder ตั้งแล้วหรือยัง
- Nodes/Spawners เจอไหม
- backup พร้อมไหม
- Preflight ผ่านไหม
- reload/restart command พร้อมใช้หรือยัง
- ค้นหา item, node, spawner หรือ setting ทั้งระบบ

ถ้า Dashboard ยังมี critical issue อย่าเพิ่งไป save ไฟล์จริง

## App Settings

หน้านี้สำคัญที่สุดตอนเริ่มต้น เพราะเป็นตัวบอกแอปว่าจะไปอ่าน/เขียนไฟล์ที่ไหน

ช่องหลัก:

- `SCUM config folder`: โฟลเดอร์ config หลักของ SCUM server
- `Backup folder`: ที่เก็บ backup
- `Nodes folder`: โฟลเดอร์ Nodes ถ้าใช้ path แยก
- `Spawners folder`: โฟลเดอร์ Spawners ถ้าใช้ path แยก
- `Reload loot command`: script หรือ command สำหรับ reload loot
- `Restart server command`: script หรือ command สำหรับ restart server
- `Auto backup core files on start`: ให้แอป backup ไฟล์หลักตอนเปิด

reload/restart ควรทดสอบนอกแอปก่อน ถ้าข้างนอกยังไม่ผ่าน ในแอปก็ไม่ควรใช้

## Server Settings

ใช้แก้ `ServerSettings.ini` แบบแยกหมวดและกรองหา key ได้ ไม่ต้องไล่ไฟล์ยาวๆ เอง

เหมาะกับ:

- ค่า `True/False`
- ตัวเลข
- ข้อความ
- setting ที่อยากแก้เร็วโดยไม่เปิด raw file

ถ้าเปลี่ยนค่าหลายตัว ให้ preview ก่อน save และ backup ไว้ก่อนเสมอ

## Core Files

ใช้แก้ไฟล์หลักที่ยังเป็น raw editor:

- `GameUserSettings.ini`
- `EconomyOverride.json`

หน้านี้มี validation และ metadata ช่วยดูว่าไฟล์พังหรือไม่ ก่อน save ให้ใช้ `Preview Diff` ถ้าแก้เยอะ

## Loot Studio

หน้านี้คือส่วนหลักสำหรับจัดการ loot

ด้านซ้าย:

- ค้นหาไฟล์
- เลือก `Nodes`
- เลือก `Spawners`
- สร้างไฟล์ใหม่

ตรงกลาง:

- validation
- auto-fix preview
- dependency
- simulator
- kit template

ด้านขวา:

- visual builder
- raw JSON
- clone/delete
- save หรือ save + reload

แนะนำให้เริ่มจาก visual builder ก่อน เพราะอ่านง่ายกว่า raw JSON และลดโอกาสพิมพ์ผิด

## Item Catalog

ใช้ตอนจำชื่อ item/class ไม่ได้

ทำได้:

- ค้นหา item
- ดู icon ถ้ามีไฟล์ตรงใน `scum_items-main`
- แก้ friendly name
- ใส่ category
- favorite item ที่ใช้บ่อย
- import/export metadata

ถ้าจะส่ง catalog ให้เครื่องอื่น แนะนำ export metadata ก่อน แล้วอีกเครื่อง import แบบ merge

## Validation

validation ใช้แยกปัญหาที่ควรแก้ก่อน save

ให้สนใจเป็นพิเศษ:

- missing refs
- JSON ผิด
- probability ดูผิดปกติ
- field สำคัญหาย

warning บางอย่างอาจไม่ต้องแก้ทันที แต่ critical ไม่ควรปล่อยผ่าน

## Analyzer

ใช้ดูภาพรวม loot ทั้งระบบ

ช่วยหา:

- spawner ที่อ้าง node หาย
- node ที่ไม่ได้ถูกใช้
- item ที่ซ้ำบ่อย
- balance คร่าวๆ ของ weapon/ammo/medical
- coverage ของ spawner

ถ้าเห็น unused node อย่าลบทันที ให้เช็คก่อนว่าเป็น node พิเศษหรือ standalone หรือไม่

## Graph

ใช้ดูความสัมพันธ์ของ loot เป็น flow:

```text
Spawner -> Node -> Item
```

เหมาะกับตอนอยากรู้ว่า item หนึ่งมาจากทางไหน หรือ spawner หนึ่งลาก node อะไรอยู่

## Profiles

ใช้เก็บชุด config เพื่อสลับใช้งาน

เหมาะกับ:

- solo
- pvp
- hardcore
- event
- test config

ก่อน apply profile จริง ควร backup ก่อนเสมอ

## Backups

ใช้ย้อนงานเวลาแก้พลาด

ทำได้:

- ดู snapshot
- ใส่ note/tag
- compare backup
- restore รายไฟล์
- cleanup backup เก่า

tag `keep`, `pinned`, `protected` ใช้กัน backup สำคัญไม่ให้ถูก cleanup ง่ายๆ

## Activity

ใช้ดูประวัติว่าเคยทำอะไรไปบ้าง เช่น:

- save
- backup
- restore
- apply profile
- run command

ถ้าอยู่ดีๆ config แปลก หน้านี้ช่วยไล่ย้อนว่าล่าสุดไปแก้อะไรมา

## Repair Tools

ใช้ตอนเจอปัญหา node ref ตัวเล็ก/ตัวใหญ่ไม่ตรงกัน

ดู preview ก่อน:

```powershell
npm run repair:loot-refs -- --dry-run
```

ถ้า preview บอกว่า unresolved refs เป็น `0` ค่อย apply:

```powershell
npm run repair:loot-refs
```

script จะสร้าง backup ก่อนเขียนไฟล์จริง

## Analyzer Advisory Ignore

ไฟล์ `data/loot-advisory-ignore.json` ใช้เก็บรายการที่รู้แล้วว่าเป็น warning ที่ปล่อยได้

ตัวอย่างในโปรเจกต์นี้คือ `Insects` เพราะเป็น standalone forage/insect tree ไม่ควรไปต่อ spawner ปลอมแค่เพื่อให้ analyzer เงียบ

อย่าเอา missing refs หรือ validation error จริงไปใส่ ignore file
