const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const app = express();
app.use(express.json());

async function askGeminiPro(prompt) {
    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    const context = await browser.newContext({ storageState: 'gemini_auth.json' });
    const page = await context.newPage();
    
    try {
        await page.goto('https://gemini.google.com/app', { waitUntil: 'commit', timeout: 90000 });
        const inputSelector = 'div[role="textbox"], [contenteditable="true"]';
        await page.waitForSelector(inputSelector, { timeout: 60000 });

        const masterPrompt = `Act as a Roblox Pro Builder. 
        Task: "${prompt}".

        CRITICAL INSTRUCTIONS:
        1. DECONSTRUCTION: You must break this object into at least 8-12 separate parts.
        2. ANATOMY: If it's a creature, you MUST create: 1 Torso, 4 Legs, 1 Neck, 1 Head, and 1 Tail. 
        3. COORDINATES: Calculate the CFrame for each part so they actually connect. Do not put them all at 0,0,0.
        4. VARIETY: Use different sizes for each part. (e.g., Head should be smaller than Torso).
        5. MATERIALS: Use 'SmoothPlastic' for skin, 'Neon' for eyes, 'Metal' for armor.

        Return ONLY a JSON object. No explanation.
        Example: {"actions": [{"type": "create", "className": "Part", "name": "Head", "properties": {"CFrame": [0, 10, 5, 1,0,0,0,1,0,0,0,1], "Size": [2, 2, 2]}}, ...]} `;

        await page.fill(inputSelector, masterPrompt);
        await page.keyboard.press('Enter');

        await page.waitForSelector('message-content', { timeout: 90000 });
        const responseText = await page.innerText('body');
        await browser.close();
        return responseText;
    } catch (e) {
        console.error("Browser Error:", e.message);
        await browser.close();
        throw e;
    }
}

app.post('/generate', async (req, res) => {
    try {
        console.log("VexOS Pro Building:", req.body.prompt);
        const rawResponse = await askGeminiPro(req.body.prompt);
        
        // استخراج الـ JSON الصافي باستخدام Regex لتجنب خطأ الـ Parse
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const cleanJson = jsonMatch[0].trim();
            // التأكد من صحة الـ JSON قبل الإرسال
            JSON.parse(cleanJson); 
            res.header("Content-Type", "application/json").send(cleanJson);
        } else {
            throw new Error("No valid JSON found in AI response");
        }
    } catch (error) {
        console.error("Server Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`VexOS Pro Online on ${PORT}`));
