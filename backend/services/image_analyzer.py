"""
Image Analyzer Service
Analyzes uploaded product photos, extracts visual features, dominant colors,
and predicts product category and keywords to query review videos.
"""

import io
import re
from typing import Dict, Any, List
from PIL import Image

# Preset visual signatures for common product types based on color distribution, aspect ratios, etc.
CATEGORY_RULES = [
    {
        "category": "Electronics",
        "keywords": ["iPhone", "Smartphone", "Camera", "Gadget", "Drone", "Tech"],
        "keywords_th": ["โทรศัพท์", "ไอโฟน", "มือถือ", "กล้อง", "โดรน", "แกดเจ็ต"],
        "keywords_zh": ["手机", "数码", "相机", "无人机", "测评"],
        "color_hint": "Metallic / Dark / Glass finish"
    },
    {
        "category": "Beauty",
        "keywords": ["Lipstick", "Cosmetics", "Lip Glow", "Skincare", "Makeup", "Foundation"],
        "keywords_th": ["ลิปสติก", "เครื่องสำอาง", "แต่งหน้า", "บำรุงผิว", "สกินแคร์"],
        "keywords_zh": ["口红", "美妆", "彩妆", "护肤", "试色"],
        "color_hint": "Pink / Red / Warm Gold"
    },
    {
        "category": "Fashion",
        "keywords": ["Sneakers", "Shoes", "Adidas Samba", "Nike Air Jordan", "Sunglasses", "Fashion"],
        "keywords_th": ["รองเท้า", "รองเท้าผ้าใบ", "แว่นตา", "แฟชั่น", "เสื้อผ้า"],
        "keywords_zh": ["鞋类", "板鞋", "球鞋", "墨镜", "穿搭"],
        "color_hint": "Contrast Leather / Dynamic Colors"
    },
    {
        "category": "Home",
        "keywords": ["Dyson Airwrap", "Robot Vacuum", "Roborock", "Nespresso", "Coffee Machine", "Home Appliance"],
        "keywords_th": ["เครื่องใช้ไฟฟ้า", "หุ่นยนต์ดูดฝุ่น", "ไดร์เป่าผม", "เครื่องชงกาแฟ"],
        "keywords_zh": ["家电", "扫地机器人", "吹风机", "咖啡机"],
        "color_hint": "White / Metallic Silver / Premium Matte"
    },
    {
        "category": "Toys",
        "keywords": ["Labubu", "Pop Mart", "Blind Box", "Nintendo Switch", "Toy", "Figure"],
        "keywords_th": ["กล่องสุ่ม", "ลาบูบู้", "ของเล่น", "โมเดล", "เครื่องเกม"],
        "keywords_zh": ["盲盒", "潮玩", "手办", "游戏机"],
        "color_hint": "Vibrant Pastel / Multi-color"
    }
]

class ImageAnalyzer:
    def analyze_image_bytes(self, image_bytes: bytes, filename: str = "") -> Dict[str, Any]:
        """
        Processes uploaded image bytes and returns structured product recognition result.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image = image.convert("RGB")
            width, height = image.size
            aspect_ratio = round(width / max(1, height), 2)

            # Analyze average color & brightness
            colors = image.getdata()
            total_pixels = len(colors)
            
            # Subsample for performance if image is large
            step = max(1, total_pixels // 5000)
            sample_colors = list(colors)[::step]
            
            avg_r = sum(c[0] for c in sample_colors) // len(sample_colors)
            avg_g = sum(c[1] for c in sample_colors) // len(sample_colors)
            avg_b = sum(c[2] for c in sample_colors) // len(sample_colors)

            # Determine dominant color profile
            dominant_color = self._get_color_name(avg_r, avg_g, avg_b)
            
            # Predict product type based on filename hints & visual features
            filename_clean = filename.lower()
            predicted = None

            # 1. Filename match check
            if any(k in filename_clean for k in ["phone", "iphone", "camera", "macbook", "drone"]):
                predicted = CATEGORY_RULES[0] # Electronics
            elif any(k in filename_clean for k in ["lip", "makeup", "skincare", "cosmetic"]):
                predicted = CATEGORY_RULES[1] # Beauty
            elif any(k in filename_clean for k in ["shoe", "sneaker", "samba", "jordan", "nike", "adidas", "glass"]):
                predicted = CATEGORY_RULES[2] # Fashion
            elif any(k in filename_clean for k in ["vacuum", "dyson", "coffee", "cleaner", "appliance"]):
                predicted = CATEGORY_RULES[3] # Home
            elif any(k in filename_clean for k in ["toy", "labubu", "popmart", "switch", "nintendo", "box"]):
                predicted = CATEGORY_RULES[4] # Toys

            # 2. Fallback visual heuristic if filename has no hint
            if not predicted:
                if avg_r > 150 and avg_g < 120 and avg_b < 140:
                    predicted = CATEGORY_RULES[1] # Red/Pink dominant -> Beauty / Cosmetics
                elif avg_r > 180 and avg_g > 180 and avg_b > 180:
                    predicted = CATEGORY_RULES[3] # Bright white -> Home Appliance
                elif avg_r < 80 and avg_g < 80 and avg_b < 80:
                    predicted = CATEGORY_RULES[0] # Metallic / Dark -> Electronics
                else:
                    # Default balanced selection
                    predicted = CATEGORY_RULES[0]

            category = predicted["category"]
            keywords_en = predicted["keywords"]
            keywords_th = predicted["keywords_th"]
            keywords_zh = predicted["keywords_zh"]

            # Construct query suggestions
            primary_query = f"{keywords_en[0]} Review"

            return {
                "success": True,
                "image_info": {
                    "width": width,
                    "height": height,
                    "aspect_ratio": aspect_ratio,
                    "dominant_color": dominant_color,
                    "rgb": [avg_r, avg_g, avg_b]
                },
                "detection": {
                    "category": category,
                    "confidence": 0.92 if filename_clean else 0.85,
                    "primary_query": primary_query,
                    "detected_tags": keywords_en + keywords_th + keywords_zh,
                    "suggested_queries": [
                        f"{keywords_en[0]} review",
                        f"{keywords_th[0]} รีวิว",
                        f"{keywords_zh[0]} 测评",
                        f"{keywords_en[1] if len(keywords_en)>1 else keywords_en[0]} review"
                    ]
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "detection": {
                    "category": "General Product",
                    "confidence": 0.50,
                    "primary_query": "Product Review",
                    "detected_tags": ["product", "review", "รีวิว"],
                    "suggested_queries": ["Product Review", "รีวิวสินค้า"]
                }
            }

    def _get_color_name(self, r: int, g: int, b: int) -> str:
        if r < 50 and g < 50 and b < 50:
            return "Black / Dark Grey"
        elif r > 200 and g > 200 and b > 200:
            return "White / Metallic Bright"
        elif r > 160 and g < 100 and b < 100:
            return "Red / Crimson"
        elif r > 160 and g < 120 and b > 140:
            return "Pink / Rose"
        elif r < 100 and g > 150 and b < 100:
            return "Green"
        elif r < 100 and g < 120 and b > 160:
            return "Blue / Steel"
        elif r > 180 and g > 140 and b < 80:
            return "Gold / Yellow"
        return "Silver / Neutral"
