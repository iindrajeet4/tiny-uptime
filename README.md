# tiny-uptime

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status page](https://img.shields.io/badge/status%20page-live-brightgreen.svg)](https://iindrajeet4.github.io/tiny-uptime/)

A lightweight, serverless uptime monitor powered entirely by **GitHub Actions** (checks) and **GitHub Pages** (status page). No servers, no databases, no dependencies.

Inspired by [Upptime](https://github.com/upptime/upptime) (MIT) — this is an independent, minimal implementation; no code was copied.

**[🔗 Live status page / ดูหน้าสถานะจริง](https://iindrajeet4.github.io/tiny-uptime/)** — served by GitHub Pages from the **`/docs`** folder of this repo.

## How it works

1. A GitHub Actions workflow runs `check.js` every 10 minutes (GitHub may throttle scheduled runs, so actual intervals can vary).
2. `check.js` performs a GET request to every site in `sites.json` (15s timeout, one automatic retry before a site is marked down; an error on one site never aborts the rest) and records `{timestamp, status, httpCode, responseTimeMs}`.
3. Results are committed back to the repo: a current snapshot in `docs/data/status.json` and per-site history in `docs/data/history/<slug>.json` (last 500 checks kept).
4. GitHub Pages serves `docs/index.html` — a static dashboard with UP/DOWN badges, response times, 24h/7d uptime percentages, and a bar strip of recent checks. Bilingual (EN/TH) with dark/light themes.

## Setup

1. **Fork [https://github.com/iindrajeet4/tiny-uptime](https://github.com/iindrajeet4/tiny-uptime) or use it as a template** on GitHub.
2. **Edit `sites.json`** with your sites:
   ```json
   [
     { "name": "My Site", "url": "https://mysite.com" }
   ]
   ```
3. **Enable Actions**: go to the *Actions* tab and enable workflows. You can trigger a first run manually via *Uptime Check → Run workflow*.
4. **Enable Pages**: *Settings → Pages → Build and deployment → Deploy from a branch*, choose your default branch and the **`/docs`** folder.
5. Your status page will be at `https://<username>.github.io/<repo>/`.

## Alerts (optional)

When a site changes state (up→down or down→up), `check.js` can send a notification. Configure secrets in *Settings → Secrets and variables → Actions*:

| Secret | Purpose |
|---|---|
| `DISCORD_WEBHOOK` | Discord webhook URL — a message is posted to that channel. |
| `LINE_MESSAGING_TOKEN` | LINE Messaging API channel access token. |
| `LINE_TO` | LINE userId or groupId to push the message to (required with the token). |

If no secrets are set, alerting is silently skipped — everything else works normally.

## Local test

```bash
node check.js   # requires Node 20+
```

---

# tiny-uptime (ภาษาไทย)

ระบบตรวจสอบสถานะเว็บไซต์ (uptime monitor) แบบไร้เซิร์ฟเวอร์ ทำงานด้วย **GitHub Actions** (ตรวจสอบ) และ **GitHub Pages** (หน้าแสดงสถานะ) — ไม่ต้องมีเซิร์ฟเวอร์ ไม่ต้องมีฐานข้อมูล และไม่ใช้ dependency ใด ๆ

ได้แรงบันดาลใจจาก [Upptime](https://github.com/upptime/upptime) (MIT) — พัฒนาขึ้นใหม่ทั้งหมด ไม่ได้คัดลอกโค้ด

## หลักการทำงาน

1. GitHub Actions รัน `check.js` ทุก 10 นาที (GitHub อาจหน่วงเวลารันตามตารางได้ ช่วงเวลาจริงอาจคลาดเคลื่อน)
2. `check.js` ยิง GET request ไปยังทุกเว็บใน `sites.json` (timeout 15 วินาที และลองซ้ำอีก 1 ครั้งก่อนสรุปว่าเว็บล่ม — ความผิดพลาดของเว็บหนึ่งจะไม่กระทบการตรวจสอบเว็บอื่น) และบันทึกผล
3. ผลลัพธ์ถูก commit กลับเข้า repo: สแนปช็อตปัจจุบันใน `docs/data/status.json` และประวัติรายเว็บใน `docs/data/history/<slug>.json` (เก็บ 500 รายการล่าสุด)
4. GitHub Pages แสดง `docs/index.html` — แดชบอร์ดสถานะพร้อมป้าย UP/DOWN, เวลาตอบสนอง, เปอร์เซ็นต์อัปไทม์ 24 ชม./7 วัน และแถบแสดงผลการตรวจสอบล่าสุด รองรับสองภาษา (EN/ไทย) และธีมมืด/สว่าง

## วิธีติดตั้ง

1. **Fork [https://github.com/iindrajeet4/tiny-uptime](https://github.com/iindrajeet4/tiny-uptime) หรือใช้เป็น template** บน GitHub
2. **แก้ไข `sites.json`** ใส่เว็บไซต์ที่ต้องการตรวจสอบ
3. **เปิดใช้งาน Actions** ที่แท็บ *Actions* และสามารถสั่งรันครั้งแรกเองได้ที่ *Uptime Check → Run workflow*
4. **เปิดใช้งาน Pages**: *Settings → Pages → Deploy from a branch* เลือก branch หลักและโฟลเดอร์ **`/docs`**
5. หน้าแสดงสถานะจะอยู่ที่ `https://<username>.github.io/<repo>/`

## การแจ้งเตือน (ไม่บังคับ)

เมื่อสถานะเว็บเปลี่ยน (ปกติ→ล่ม หรือ ล่ม→ปกติ) ระบบจะส่งการแจ้งเตือนได้ โดยตั้งค่า secrets ที่ *Settings → Secrets and variables → Actions*:

- `DISCORD_WEBHOOK` — URL ของ Discord webhook
- `LINE_MESSAGING_TOKEN` — channel access token ของ LINE Messaging API
- `LINE_TO` — userId หรือ groupId ปลายทาง (ต้องใช้คู่กับ token)

หากไม่ตั้งค่า secrets ระบบจะข้ามการแจ้งเตือนโดยอัตโนมัติ ส่วนอื่นทำงานตามปกติ

## License

MIT — see [LICENSE](LICENSE).

---

## 💼 Services & custom work

I take on freelance and contract work around this project — custom implementation,
new features, and integration with your stack.

**Contact:** [GitHub @iindrajeet4](https://github.com/iindrajeet4) (opening an issue on this repo works too) · [DubeGames](https://dubegames.indrajeetdubeyy.workers.dev/)
