import requests
from config import AGNES_API_KEY, AGNES_BASE_URL

VIDEO_MODEL = "agnes-video-v2.0"

def create_video(prompt, image=None, mode='ti2vid', num_frames=121, frame_rate=24, width=1152, height=768, seed=None, negative_prompt=None):
    url = f"{AGNES_BASE_URL}/v1/videos"
    headers = {
        "Authorization": f"Bearer {AGNES_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": VIDEO_MODEL,
        "prompt": prompt,
        "num_frames": num_frames,
        "frame_rate": frame_rate,
        "width": width,
        "height": height,
    }
    if image:
        payload["image"] = image
    if seed is not None:
        payload["seed"] = seed
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=60, proxies={'http': None, 'https': None})
        if resp.status_code == 200:
            data = resp.json()
            return {
                "task_id": data.get("task_id") or data.get("id"),
                "video_id": data.get("video_id"),
                "status": data.get("status"),
                "progress": data.get("progress", 0),
                "seconds": data.get("seconds"),
                "size": data.get("size"),
            }
        else:
            return {"error": f"创建任务失败 ({resp.status_code}): {resp.text}"}
    except Exception as e:
        return {"error": f"请求异常: {str(e)}"}

def get_video_status(video_id, model_name=VIDEO_MODEL):
    try:
        url = f"{AGNES_BASE_URL}/agnesapi?video_id={video_id}&model_name={model_name}"
        headers = {
            "Authorization": f"Bearer {AGNES_API_KEY}",
            "Content-Type": "application/json"
        }
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "status": data.get("status"),
                "progress": data.get("progress", 0),
                "url": data.get("url"),
                "seconds": data.get("seconds"),
                "size": data.get("size"),
                "error": data.get("error"),
            }
        else:
            return {"error": f"查询失败 ({resp.status_code}): {resp.text}"}
    except Exception as e:
        return {"error": f"查询异常: {str(e)}"}
