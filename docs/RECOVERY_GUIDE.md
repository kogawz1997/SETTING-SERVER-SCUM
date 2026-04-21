# Recovery Guide

ถ้า save แล้วค่าพัง ให้ทำตามลำดับนี้

1. หยุด reload/restart เพิ่ม
2. เปิดหน้า `Activity` เพื่อดูว่าล่าสุดแก้ไฟล์ไหน
3. เปิดหน้า `Backups`
4. เลือก backup ก่อนหน้าการแก้
5. เลือกไฟล์ที่เสีย
6. กด restore เฉพาะไฟล์นั้น
7. กลับไปหน้าเดิมแล้ว reload ไฟล์
8. รัน validation หรือ Preflight อีกรอบ

ถ้าไม่แน่ใจว่าไฟล์ไหนเสีย ให้ใช้ `Backups` compare ก่อน restore

สิ่งที่ควรทำก่อนงานเสี่ยง:

- ตั้ง backup folder ให้ชัด
- ใส่ tag ให้ backup สำคัญ เช่น `keep` หรือ `before-event`
- ใช้ `Preview Diff` ก่อน save
- อย่ากด `Save + Reload` ถ้า reload command ยังไม่ผ่าน check

ถ้าไฟล์ JSON พัง:

- เปิด `Diff Preview` เพื่อดูตำแหน่งที่เปลี่ยน
- ใช้ restore รายไฟล์ก่อน
- อย่าแก้สดทับหลายรอบจน backup ดีหายไป
