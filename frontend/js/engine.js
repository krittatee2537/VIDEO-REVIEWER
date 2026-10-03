/**
 * Client-side search engine used when no backend is available (e.g. GitHub Pages).
 * Mirrors backend/services/video_aggregator.py and image_analyzer.py.
 */
(function () {
    const CATEGORY_RULES = [
        { category: "Electronics", keywords: ["iPhone", "Smartphone", "Camera", "Gadget", "Drone", "Tech"],
          keywords_th: ["โทรศัพท์", "ไอโฟน", "มือถือ", "กล้อง", "โดรน", "แกดเจ็ต"],
          keywords_zh: ["手机", "数码", "相机", "无人机", "测评"] },
        { category: "Beauty", keywords: ["Lipstick", "Cosmetics", "Lip Glow", "Skincare", "Makeup", "Foundation"],
          keywords_th: ["ลิปสติก", "เครื่องสำอาง", "แต่งหน้า", "บำรุงผิว", "สกินแคร์"],
          keywords_zh: ["口红", "美妆", "彩妆", "护肤", "试色"] },
        { category: "Fashion", keywords: ["Sneakers", "Shoes", "Adidas Samba", "Nike Air Jordan", "Sunglasses", "Fashion"],
          keywords_th: ["รองเท้า", "รองเท้าผ้าใบ", "แว่นตา", "แฟชั่น", "เสื้อผ้า"],
          keywords_zh: ["鞋类", "板鞋", "球鞋", "墨镜", "穿搭"] },
        { category: "Home", keywords: ["Dyson Airwrap", "Robot Vacuum", "Roborock", "Nespresso", "Coffee Machine", "Home Appliance"],
          keywords_th: ["เครื่องใช้ไฟฟ้า", "หุ่นยนต์ดูดฝุ่น", "ไดร์เป่าผม", "เครื่องชงกาแฟ"],
          keywords_zh: ["家电", "扫地机器人", "吹风机", "咖啡机"] },
        { category: "Toys", keywords: ["Labubu", "Pop Mart", "Blind Box", "Nintendo Switch", "Toy", "Figure"],
          keywords_th: ["กล่องสุ่ม", "ลาบูบู้", "ของเล่น", "โมเดล", "เครื่องเกม"],
          keywords_zh: ["盲盒", "潮玩", "手办", "游戏机"] }
    ];

    const FILENAME_HINTS = [
        [["phone", "iphone", "camera", "macbook", "drone"], 0],
        [["lip", "makeup", "skincare", "cosmetic"], 1],
        [["shoe", "sneaker", "samba", "jordan", "nike", "adidas", "glass"], 2],
        [["vacuum", "dyson", "coffee", "cleaner", "appliance"], 3],
        [["toy", "labubu", "popmart", "switch", "nintendo", "box"], 4]
    ];

    function computeRelevance(item, terms, rawQuery) {
        if (!terms.length) return 80;
        let score = 0;
        const q = rawQuery.toLowerCase();
        const title = item.title.toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const kws = (item.keywords || []).map(k => k.toLowerCase());
        if (title.includes(q)) score += 60;
        for (const t of terms) {
            if (title.includes(t)) score += 30;
            if (kws.some(k => k.includes(t))) score += 25;
            if (desc.includes(t)) score += 10;
        }
        return Math.min(99, score);
    }

    function searchVideos({ query = "", region = "all", platform = "all", category = "all", sort_by = "relevance" }) {
        const terms = query.split(/\s+/).map(s => s.trim().toLowerCase()).filter(Boolean);
        const results = [];

        for (const item of window.SEED_VIDEOS) {
            if (region !== "all" && item.region !== region) continue;
            if (platform !== "all" && item.platform !== platform) continue;
            if (category !== "all" && (item.category || "").toLowerCase() !== category.toLowerCase()) continue;

            const score = computeRelevance(item, terms, query);
            if (terms.length && score <= 0) continue;

            const meta = window.PLATFORM_METADATA[item.platform] || {};
            results.push({
                ...item,
                computed_score: score,
                platform_icon: meta.icon || "🎥",
                badge_bg: meta.badge_bg || "rgba(255,255,255,0.1)",
                badge_text: meta.badge_text || "#ffffff"
            });
        }

        if (sort_by === "views") {
            results.sort((a, b) => (b.view_count_raw || 0) - (a.view_count_raw || 0));
        } else if (sort_by === "newest") {
            results.sort((a, b) => (b.publish_date || "").localeCompare(a.publish_date || ""));
        } else {
            results.sort((a, b) => (b.computed_score - a.computed_score) || ((b.view_count_raw || 0) - (a.view_count_raw || 0)));
        }

        const platforms = {};
        results.forEach(r => { platforms[r.platform] = (platforms[r.platform] || 0) + 1; });

        return {
            query, total: results.length,
            region_filter: region, platform_filter: platform, category_filter: category,
            stats: {
                china_total: results.filter(r => r.region === "china").length,
                international_total: results.filter(r => r.region === "international").length,
                platforms
            },
            results
        };
    }

    /** Average color of the image, sampled on a small canvas. */
    function averageColor(file) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const size = 64;
                const canvas = document.createElement("canvas");
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, size, size);
                const data = ctx.getImageData(0, 0, size, size).data;
                let r = 0, g = 0, b = 0;
                const n = data.length / 4;
                for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
                URL.revokeObjectURL(url);
                resolve({ r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), width: img.width, height: img.height });
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    }

    async function analyzeImage(file) {
        const name = (file.name || "").toLowerCase();
        let rule = null;
        for (const [hints, idx] of FILENAME_HINTS) {
            if (hints.some(h => name.includes(h))) { rule = CATEGORY_RULES[idx]; break; }
        }

        const c = await averageColor(file);
        if (!rule) {
            if (c && c.r > 150 && c.g < 120 && c.b < 140) rule = CATEGORY_RULES[1];
            else if (c && c.r > 180 && c.g > 180 && c.b > 180) rule = CATEGORY_RULES[3];
            else rule = CATEGORY_RULES[0];
        }

        return {
            success: true,
            image_info: c ? { width: c.width, height: c.height, rgb: [c.r, c.g, c.b] } : {},
            detection: {
                category: rule.category,
                primary_query: `${rule.keywords[0]} Review`,
                detected_tags: [...rule.keywords, ...rule.keywords_th, ...rule.keywords_zh],
                suggested_queries: [
                    `${rule.keywords[0]} review`,
                    `${rule.keywords_th[0]} รีวิว`,
                    `${rule.keywords_zh[0]} 测评`
                ]
            }
        };
    }

    window.LocalSearchEngine = { searchVideos, analyzeImage };
})();
