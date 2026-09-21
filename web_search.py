import urllib.request
import urllib.parse
import json
import ssl

def duckduckgo_search(query, max_results=3):
    if not query:
        return {"error": "搜索查询为空"}
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=10, context=context) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        results = []
        if data.get('AbstractText'):
            results.append({
                "title": data.get('AbstractSource', ''),
                "snippet": data['AbstractText'],
                "url": data.get('AbstractURL', '')
            })
        for topic in data.get('RelatedTopics', []):
            if 'Text' in topic and 'FirstURL' in topic:
                results.append({
                    "title": topic.get('Text', '').split(' - ')[0] if ' - ' in topic.get('Text', '') else '',
                    "snippet": topic.get('Text', ''),
                    "url": topic.get('FirstURL', '')
                })
                if len(results) >= max_results:
                    break
        if not results:
            return {"error": "未找到相关信息"}
        return results
    except Exception as e:
        return {"error": f"搜索请求失败: {e}"}

def format_search_results(results):
    if isinstance(results, dict) and "error" in results:
        return f"❌ {results['error']}"
    if not results:
        return "没有找到相关内容。"
    output = "🔍 **搜索到的信息**：\n"
    for i, item in enumerate(results[:3], 1):
        title = item.get('title', '无标题')
        snippet = item.get('snippet', '')
        url = item.get('url', '')
        output += f"{i}. **{title}**\n   {snippet}\n   📎 {url}\n\n"
    return output
