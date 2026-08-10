import requests
from config import AGNES_API_KEY, AGNES_BASE_URL

IMAGE_MODEL = "agnes-image-2.1-flash"
DEFAULT_SIZE = "1024x768"

def generate_image(prompt, size=DEFAULT_SIZE, return_base64=False):
    url = f"{AGNES_BASE_URL}/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {AGNES_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": IMAGE_MODEL,
        "prompt": prompt,
        "size": size
    }
    if return_base64:
        payload["return_base64"] = True
    else:
        payload["extra_body"] = {"response_format": "url"}

    try:
        # 添加 proxies 参数绕过 PythonAnywhere 代理
        resp = requests.post(url, json=payload, headers=headers, timeout=180, proxies={'http': None, 'https': None})
        if resp.status_code == 200:
            data = resp.json()
            if return_base64:
                return data["data"][0]["b64_json"]
            else:
                return data["data"][0]["url"]
        else:
            return {"error": f"生成失败 ({resp.status_code}): {resp.text}"}
    except Exception as e:
        return {"error": f"请求异常: {str(e)}"}

def image_to_image(prompt, image_url_or_base64, size=DEFAULT_SIZE, return_base64=False):
    url = f"{AGNES_BASE_URL}/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {AGNES_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": IMAGE_MODEL,
        "prompt": prompt,
        "size": size,
        "extra_body": {
            "image": [image_url_or_base64],
            "response_format": "b64_json" if return_base64 else "url"
        }
    }

    try:
        # 添加 proxies 参数
        resp = requests.post(url, json=payload, headers=headers, timeout=180, proxies={'http': None, 'https': None})
        if resp.status_code == 200:
            data = resp.json()
            if return_base64:
                return data["data"][0]["b64_json"]
            else:
                return data["data"][0]["url"]
        else:
            return {"error": f"图生图失败 ({resp.status_code}): {resp.text}"}
    except Exception as e:
        return {"error": f"请求异常: {str(e)}"}
