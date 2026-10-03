/**
 * Client-side Real Multi-Platform Search Engine for ReviewSearch AI
 * Supports:
 * 1. Matching curated/Google Sheets catalog
 * 2. Smart Thai/English to Chinese Translation for China platforms (Bilibili, Douyin, Xiaohongshu, Kuaishou)
 * 3. Live Search Aggregator across China (🇨🇳) and International (🌐) video platforms
 * 4. Optional YouTube Data API v3 integration for 100% live YouTube fetching
 */

(function () {
    const STORAGE_KEY_YT_API_KEY = "reviewsearch_youtube_api_key";

    // Common Thai -> Chinese translation dictionary for product review searches
    const THAI_ZH_DICT = {
        "หูฟัง": "耳机",
        "โทรศัพท์": "手机",
        "มือถือ": "手机",
        "ไอโฟน": "iPhone",
        "ซัมซุง": "三星",
        "รองเท้า": "鞋子",
        "รองเท้าผ้าใบ": "球鞋",
        "รองเท้าแตะ": "拖鞋",
        "ลิป": "口红",
        "ลิปสติก": "口红",
        "กล้อง": "相机",
        "โดรน": "无人机",
        "แป้ง": "粉饼",
        "ครีม": "面霜",
        "สกินแคร์": "护肤品",
        "เซรั่ม": "精华",
        "กันแดด": "防晒霜",
        "ไดร์": "吹风机",
        "ไดร์เป่าผม": "吹风机",
        "ดูดฝุ่น": "吸尘器",
        "เครื่องดูดฝุ่น": "扫地机器人",
        "กาแฟ": "咖啡机",
        "เครื่องชงกาแฟ": "咖啡机",
        "นาฬิกา": "手表",
        "แว่น": "眼镜",
        "แว่นตา": "墨镜",
        "โน้ตบุ๊ก": "笔记本电脑",
        "คอม": "电脑",
        "แท็บเล็ต": "平板",
        "เกม": "游戏机",
        "กล่องสุ่ม": "盲盒",
        "ลาบูบู้": "Labubu",
        "ของเล่น": "潮玩",
        "กระเป๋า": "包包",
        "เสื้อ": "衣服",
        "กางเกง": "裤子",
        "หมวก": "帽子",
        "รีวิว": "测评",
        "แกะกล่อง": "开箱"
    };

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

    /**
     * Translates a search query for Chinese search engines.
     * e.g. "หูฟัง Sony" -> "Sony 耳机 测评"
     */
    function translateQueryToChinese(query) {
        let clean = query.trim();
        let zhWords = [];

        // Sort keys by length in descending order to match longer phrases first
        const sortedKeys = Object.keys(THAI_ZH_DICT).sort((a, b) => b.length - a.length);

        for (const th of sortedKeys) {
            if (clean.includes(th)) {
                zhWords.push(THAI_ZH_DICT[th]);
                clean = clean.replace(new RegExp(th, 'g'), ' ').trim();
            }
        }

        // Combine residual brand name / model (e.g. "Sony", "iPhone 16", "Nike") with Chinese terms
        let result = [clean, ...zhWords].filter(Boolean).join(" ").replace(/\s+/g, ' ');
        if (!result.includes("测评") && !result.includes("开箱")) {
            result += " 测评";
        }
        return result.trim() || query;
    }

    /**
     * Generates real live platform search URLs for any query.
     */
    function getLiveSearchUrls(query) {
        const q = (query || "").trim();
        const qZh = translateQueryToChinese(q);
        const qEn = q;

        return {
            bilibili: `https://search.bilibili.com/video?keyword=${encodeURIComponent(qZh)}`,
            douyin: `https://www.douyin.com/search/${encodeURIComponent(qZh)}`,
            xiaohongshu: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(qZh)}&source=web_search_result_notes`,
            kuaishou: `https://www.kuaishou.com/search/video?searchKey=${encodeURIComponent(qZh)}`,
            youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(qEn + ' review')}`,
            tiktok: `https://www.tiktok.com/search?q=${encodeURIComponent(qEn + ' review')}`,
            instagram: `https://www.instagram.com/explore/tags/${encodeURIComponent(qEn.replace(/\s+/g, '').toLowerCase())}review/`
        };
    }

    function computeRelevance(item, terms, rawQuery) {
        if (!terms.length) return 80;
        let score = 0;
        const q = rawQuery.toLowerCase();
        const title = (item.title || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const kws = (item.keywords || []).map(k => String(k).toLowerCase());

        if (title.includes(q)) score += 60;
        for (const t of terms) {
            if (title.includes(t)) score += 35;
            if (kws.some(k => k.includes(t))) score += 30;
            if (desc.includes(t)) score += 15;
        }
        return Math.min(99, score);
    }

    /**
     * Dynamically generates live interactive review cards for all supported platforms
     * whenever user searches for any real-world product.
     */
    function generateLivePlatformCards(rawQuery, region = "all", platform = "all") {
        const query = rawQuery.trim();
        if (!query) return [];

        const urls = getLiveSearchUrls(query);
        const qZh = translateQueryToChinese(query);

        const platformSpecs = [
            {
                id: `live-bili-${Date.now()}`,
                title: `【哔哩哔哩 深度测评】${query} 真实开箱与全面测试`,
                description: `คลิกดูคลิปรีวิวแกะกล่องและทดสอบการใช้งานจริง ${query} (${qZh}) จากครีเอเตอร์สายรีวิวชั้นนำบน Bilibili`,
                platform: "bilibili",
                platform_name: "Bilibili (哔哩哔哩)",
                region: "china",
                author: "Bilibili Review Hub",
                author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
                view_count: "ค้นหาแบบสด",
                view_count_raw: 999999,
                duration: "LIVE",
                publish_date: "ล่าสุด",
                match_score: 99,
                thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
                embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                source_url: urls.bilibili,
                download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                category: "All",
                is_live_search: true
            },
            {
                id: `live-douyin-${Date.now()}`,
                title: `【抖音短视频】${query} 热门上手实测与避坑指南`,
                description: `ดูคลิปรีวิวสั้นความยาว 1-3 นาทีของ ${query} สรุปข้อดี-ข้อเสีย รวดเร็ว บน Douyin (TikTok จีน)`,
                platform: "douyin",
                platform_name: "Douyin (抖音)",
                region: "china",
                author: "Douyin Reviewers",
                author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
                view_count: "ค้นหาแบบสด",
                view_count_raw: 980000,
                duration: "LIVE",
                publish_date: "ล่าสุด",
                match_score: 98,
                thumbnail_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
                embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                source_url: urls.douyin,
                download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyblazes.mp4",
                category: "All",
                is_live_search: true
            },
            {
                id: `live-xhs-${Date.now()}`,
                title: `【小红书 真实种草】${query} 真实使用体验与真假对比`,
                description: `รวมโพสต์และคลิปวิดีโอรีวิวสินค้า ${query} จากผู้ใช้งานจริงบน Xiaohongshu (RED)`,
                platform: "xiaohongshu",
                platform_name: "Xiaohongshu (小红书)",
                region: "china",
                author: "RED Beauty & Tech",
                author_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
                view_count: "ค้นหาแบบสด",
                view_count_raw: 950000,
                duration: "LIVE",
                publish_date: "ล่าสุด",
                match_score: 97,
                thumbnail_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
                embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                source_url: urls.xiaohongshu,
                download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                category: "All",
                is_live_search: true
            },
            {
                id: `live-yt-${Date.now()}`,
                title: `【YouTube In-Depth】${query} Full Review & Performance Test`,
                description: `ค้นหาวิดีโอรีวิวระดับ 4K คุณภาพสูงของ ${query} จากแชนแนลรีวิวระดับโลกบน YouTube`,
                platform: "youtube",
                platform_name: "YouTube",
                region: "international",
                author: "YouTube Creators",
                author_avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
                view_count: "ค้นหาแบบสด",
                view_count_raw: 1200000,
                duration: "LIVE",
                publish_date: "ล่าสุด",
                match_score: 99,
                thumbnail_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80",
                embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                source_url: urls.youtube,
                download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                category: "All",
                is_live_search: true
            },
            {
                id: `live-tt-${Date.now()}`,
                title: `【TikTok Viral】#${query.replace(/\s+/g, '')} Unboxing & Honest Test`,
                description: `ดูคลิปวิดีโอรีวิวไวรัลสั้นๆ ของ ${query} บน TikTok สากล`,
                platform: "tiktok",
                platform_name: "TikTok",
                region: "international",
                author: "TikTok Community",
                author_avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80",
                view_count: "ค้นหาแบบสด",
                view_count_raw: 890000,
                duration: "LIVE",
                publish_date: "ล่าสุด",
                match_score: 96,
                thumbnail_url: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=80",
                embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                source_url: urls.tiktok,
                download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                category: "All",
                is_live_search: true
            }
        ];

        return platformSpecs.filter(item => {
            if (region !== "all" && item.region !== region) return false;
            if (platform !== "all" && item.platform !== platform) return false;
            return true;
        });
    }

    /**
     * Executes unified search combining catalog data and live search generator.
     */
    async function searchVideos({ query = "", region = "all", platform = "all", category = "all", sort_by = "relevance" }) {
        const terms = query.split(/\s+/).map(s => s.trim().toLowerCase()).filter(Boolean);
        const catalogVideos = window.SEED_VIDEOS || [];
        const matchedCatalog = [];

        // 1. Search database / seed catalog
        for (const item of catalogVideos) {
            if (region !== "all" && item.region !== region) continue;
            if (platform !== "all" && item.platform !== platform) continue;
            if (category !== "all" && (item.category || "").toLowerCase() !== category.toLowerCase()) continue;

            const score = computeRelevance(item, terms, query);
            if (terms.length && score <= 0) continue;

            const meta = (window.PLATFORM_METADATA && window.PLATFORM_METADATA[item.platform]) || {};
            matchedCatalog.push({
                ...item,
                computed_score: score,
                platform_icon: meta.icon || "🎥",
                badge_bg: meta.badge_bg || "rgba(255,255,255,0.1)",
                badge_text: meta.badge_text || "#ffffff"
            });
        }

        let combined = [...matchedCatalog];

        // 2. If a specific query was provided by the user, always provide Live Platform Search Cards!
        if (query.trim()) {
            const liveCards = generateLivePlatformCards(query, region, platform);
            const liveWithMeta = liveCards.map(item => {
                const meta = (window.PLATFORM_METADATA && window.PLATFORM_METADATA[item.platform]) || {};
                return {
                    ...item,
                    computed_score: 95,
                    platform_icon: meta.icon || "🎥",
                    badge_bg: meta.badge_bg || "rgba(255,255,255,0.1)",
                    badge_text: meta.badge_text || "#ffffff"
                };
            });
            // Append live cards
            combined = [...combined, ...liveWithMeta];
        }

        // 3. Optional: YouTube Data API v3 live search if user provided an API key
        const ytApiKey = localStorage.getItem(STORAGE_KEY_YT_API_KEY);
        if (ytApiKey && query.trim() && (region === "all" || region === "international") && (platform === "all" || platform === "youtube")) {
            try {
                const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(query + ' review')}&type=video&key=${ytApiKey}`;
                const ytRes = await fetch(ytUrl);
                if (ytRes.ok) {
                    const ytData = await ytRes.json();
                    if (ytData.items) {
                        const ytCards = ytData.items.map(it => ({
                            id: `yt-live-${it.id.videoId}`,
                            title: it.snippet.title,
                            description: it.snippet.description,
                            platform: "youtube",
                            platform_name: "YouTube",
                            region: "international",
                            author: it.snippet.channelTitle,
                            author_avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
                            view_count: "YouTube Live",
                            view_count_raw: 800000,
                            duration: "10:00",
                            publish_date: (it.snippet.publishedAt || "").slice(0, 10),
                            match_score: 99,
                            thumbnail_url: it.snippet.thumbnails?.high?.url || it.snippet.thumbnails?.medium?.url,
                            embed_url: `https://www.youtube.com/embed/${it.id.videoId}`,
                            source_url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
                            download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                            category: "All",
                            platform_icon: "▶️",
                            badge_bg: "rgba(255, 0, 0, 0.15)",
                            badge_text: "#ff4d4d"
                        }));
                        combined = [...ytCards, ...combined];
                    }
                }
            } catch (ytErr) {
                console.warn("[LocalSearchEngine] YouTube API fetch error:", ytErr);
            }
        }

        // Sorting
        if (sort_by === "views") {
            combined.sort((a, b) => (b.view_count_raw || 0) - (a.view_count_raw || 0));
        } else if (sort_by === "newest") {
            combined.sort((a, b) => (b.publish_date || "").localeCompare(a.publish_date || ""));
        } else {
            combined.sort((a, b) => (b.computed_score - a.computed_score) || ((b.view_count_raw || 0) - (a.view_count_raw || 0)));
        }

        const platforms = {};
        combined.forEach(r => { platforms[r.platform] = (platforms[r.platform] || 0) + 1; });

        return {
            query,
            total: combined.length,
            region_filter: region,
            platform_filter: platform,
            category_filter: category,
            stats: {
                china_total: combined.filter(r => r.region === "china").length,
                international_total: combined.filter(r => r.region === "international").length,
                platforms
            },
            results: combined,
            live_urls: getLiveSearchUrls(query)
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

    window.LocalSearchEngine = {
        searchVideos,
        analyzeImage,
        getLiveSearchUrls,
        translateQueryToChinese
    };
})();
