import asyncio
import json
import base64
import urllib.request
import websockets
import subprocess
import time
import os

DOCS_DIR = "/home/labib-fohayer/Projects/ASSDI/docs/design-review"
ARTIFACTS_DIR = "/home/labib-fohayer/.gemini/antigravity/brain/9f5b55db-85f1-4255-af77-dd2d29722e60"

os.makedirs(DOCS_DIR, exist_ok=True)
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

def get_auth_tokens(login_id, password):
    req = urllib.request.Request(
        'http://localhost:8001/api/v1/auth/login/',
        data=json.dumps({'login_id': login_id, 'password': password}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())['data']

coord_data = get_auth_tokens('coord01', 'CoordPass2026!')
student_data = get_auth_tokens('STD-2026-042-001', 'StudentPass2026!')

chrome_bin = "/usr/bin/google-chrome"
port = 9277
cmd = [
    chrome_bin,
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    f"--remote-debugging-port={port}",
    "--window-size=1440,1100"
]

proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)

async def main():
    try:
        req = urllib.request.Request(f"http://localhost:{port}/json/new", method="PUT")
        target_res = urllib.request.urlopen(req)
        target = json.loads(target_res.read().decode())
        ws_url = target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=16*1024*1024) as ws:
            async def send_cmd(method, params=None):
                msg_id = int(time.time() * 1000) % 100000
                payload = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    res = await ws.recv()
                    data = json.loads(res)
                    if data.get("id") == msg_id:
                        return data.get("result", {})

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")

            # Coordinator Auth Injection
            coord_js = f"""
            window.alert = function(){{}};
            window.confirm = function(){{ return true; }};
            localStorage.setItem('assdi_access_token', '{coord_data["access"]}');
            localStorage.setItem('assdi_refresh_token', '{coord_data["refresh"]}');
            localStorage.setItem('assdi_user', JSON.stringify({json.dumps(coord_data["user"])}));
            localStorage.setItem('assdi_lang', 'bn');
            """

            # 1. Capture /admin/sessions
            await send_cmd("Page.navigate", {"url": "http://localhost:3005/login"})
            await asyncio.sleep(1.5)
            await send_cmd("Runtime.evaluate", {"expression": coord_js})
            await send_cmd("Page.navigate", {"url": "http://localhost:3005/admin/sessions"})
            await asyncio.sleep(2.5)

            # Open Two-Step Approval Modal
            open_routine_approval = """
            window.alert = function(){};
            window.confirm = function(){ return true; };
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent && b.textContent.includes('দ্বিমুখী রুটিন অনুমোদন'));
            if (btn) btn.click();
            """
            await send_cmd("Runtime.evaluate", {"expression": open_routine_approval})
            await asyncio.sleep(1.5)

            res1 = await send_cmd("Page.captureScreenshot", {"format": "jpeg", "quality": 92})
            img1 = base64.b64decode(res1["data"])
            with open(os.path.join(DOCS_DIR, "phase2_routine_two_step_approval.jpg"), "wb") as f:
                f.write(img1)
            with open(os.path.join(ARTIFACTS_DIR, "phase2_routine_two_step_approval.jpg"), "wb") as f:
                f.write(img1)
            print("Captured phase2_routine_two_step_approval.jpg")

            # 2. Click Step 1 in modal to advance to Step 2
            click_step1 = """
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent && b.textContent.includes('ধাপ ১: কনফ্লিক্ট অডিট'));
            if (btn) btn.click();
            """
            await send_cmd("Runtime.evaluate", {"expression": click_step1})
            await asyncio.sleep(2.0)

            res1_step2 = await send_cmd("Page.captureScreenshot", {"format": "jpeg", "quality": 92})
            img1_step2 = base64.b64decode(res1_step2["data"])
            with open(os.path.join(DOCS_DIR, "phase2_routine_step2_confirmation.jpg"), "wb") as f:
                f.write(img1_step2)
            with open(os.path.join(ARTIFACTS_DIR, "phase2_routine_step2_confirmation.jpg"), "wb") as f:
                f.write(img1_step2)
            print("Captured phase2_routine_step2_confirmation.jpg")

            # 3. Capture /admin/exams (Examination & Results Management)
            await send_cmd("Page.navigate", {"url": "http://localhost:3005/admin/exams"})
            await asyncio.sleep(3.0)

            res2 = await send_cmd("Page.captureScreenshot", {"format": "jpeg", "quality": 92})
            img2 = base64.b64decode(res2["data"])
            with open(os.path.join(DOCS_DIR, "phase2_exams_management.jpg"), "wb") as f:
                f.write(img2)
            with open(os.path.join(ARTIFACTS_DIR, "phase2_exams_management.jpg"), "wb") as f:
                f.write(img2)
            print("Captured phase2_exams_management.jpg")

            # 4. Open Marks Entry Spreadsheet Modal on exam
            open_marks = """
            window.alert = function(){};
            window.confirm = function(){ return true; };
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent && b.textContent.includes('নম্বর এন্ট্রি'));
            if (btn) btn.click();
            """
            await send_cmd("Runtime.evaluate", {"expression": open_marks})
            await asyncio.sleep(2.0)

            res3 = await send_cmd("Page.captureScreenshot", {"format": "jpeg", "quality": 92})
            img3 = base64.b64decode(res3["data"])
            with open(os.path.join(DOCS_DIR, "phase2_marks_entry_sheet.jpg"), "wb") as f:
                f.write(img3)
            with open(os.path.join(ARTIFACTS_DIR, "phase2_marks_entry_sheet.jpg"), "wb") as f:
                f.write(img3)
            print("Captured phase2_marks_entry_sheet.jpg")

            # Close marks modal
            close_modal = """
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent && b.textContent.includes('বাতিল'));
            if (btn) btn.click();
            """
            await send_cmd("Runtime.evaluate", {"expression": close_modal})
            await asyncio.sleep(1.0)

            # 5. Open Exam Double Approval Modal
            open_approval = """
            window.alert = function(){};
            window.confirm = function(){ return true; };
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent && (b.textContent.includes('দ্বিমুখী অনুমোদন') || b.textContent.includes('ধাপ ২ প্রকাশ')));
            if (btn) btn.click();
            """
            await send_cmd("Runtime.evaluate", {"expression": open_approval})
            await asyncio.sleep(1.5)

            res4 = await send_cmd("Page.captureScreenshot", {"format": "jpeg", "quality": 92})
            img4 = base64.b64decode(res4["data"])
            with open(os.path.join(DOCS_DIR, "phase2_exam_two_step_approval.jpg"), "wb") as f:
                f.write(img4)
            with open(os.path.join(ARTIFACTS_DIR, "phase2_exam_two_step_approval.jpg"), "wb") as f:
                f.write(img4)
            print("Captured phase2_exam_two_step_approval.jpg")

            # 6. Student Login & View Published Exam Results
            student_js = f"""
            window.alert = function(){{}};
            window.confirm = function(){{ return true; }};
            localStorage.setItem('assdi_access_token', '{student_data["access"]}');
            localStorage.setItem('assdi_refresh_token', '{student_data["refresh"]}');
            localStorage.setItem('assdi_user', JSON.stringify({json.dumps(student_data["user"])}));
            localStorage.setItem('assdi_lang', 'bn');
            """
            await send_cmd("Page.navigate", {"url": "http://localhost:3005/login"})
            await asyncio.sleep(1.5)
            await send_cmd("Runtime.evaluate", {"expression": student_js})
            await send_cmd("Page.navigate", {"url": "http://localhost:3005/student?tab=results"})
            await asyncio.sleep(3.0)

            res5 = await send_cmd("Page.captureScreenshot", {"format": "jpeg", "quality": 92})
            img5 = base64.b64decode(res5["data"])
            with open(os.path.join(DOCS_DIR, "phase2_student_published_results.jpg"), "wb") as f:
                f.write(img5)
            with open(os.path.join(ARTIFACTS_DIR, "phase2_student_published_results.jpg"), "wb") as f:
                f.write(img5)
            print("Captured phase2_student_published_results.jpg")

    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
