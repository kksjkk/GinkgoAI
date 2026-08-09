import json
import os
import datetime
import time

class ConvManager:
    def __init__(self, path="ginkgo_conversations.json"):
        self.path = path
        self.data = {}
        self.current = None
        self.load()

    def load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except:
                self.data = {}

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def new(self, title=None):
        cid = str(int(time.time() * 1000))
        self.data[cid] = {
            "title": title or "新对话",
            "msgs": [],
            "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        }
        self.current = cid
        self.save()
        return cid

    def delete(self, cid):
        if cid in self.data:
            del self.data[cid]
            if self.current == cid:
                self.current = None
            self.save()

    def rename(self, cid, title):
        if cid in self.data:
            self.data[cid]["title"] = title
            self.save()

    def add_msg(self, cid, role, content, image_data=None, image_mime=None, think=None, image_url=None,
                file_name=None, file_lang=None, file_size=None):
        if cid in self.data:
            if "msgs" not in self.data[cid]:
                self.data[cid]["msgs"] = []
            msg = {"role": role, "content": content}
            if image_data:
                msg["image_data"] = image_data
                msg["image_mime"] = image_mime or "image/jpeg"
            if image_url:
                msg["image_url"] = image_url
            if think:
                msg["think"] = think
            if file_name:
                msg["file_name"] = file_name
                msg["file_lang"] = file_lang or "Code"
                msg["file_size"] = file_size or 0
            self.data[cid]["msgs"].append(msg)
            self.save()

    def msgs(self, cid):
        conv = self.data.get(cid, {})
        return conv.get("msgs", [])

    def ids(self):
        return sorted(self.data.keys(), key=lambda x: self.data[x].get("time", ""), reverse=True)

    def title(self, cid):
        conv = self.data.get(cid, {})
        return conv.get("title", "未命名")
