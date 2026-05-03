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
        
        // البرومبت الاحترافي الشامل
        const masterPrompt = `Act as a Master Roblox Architect. Task: "${prompt}".
        
        STRICT PRO RULES:
        1. DETAIL: Use 5-15 parts to create a high-quality model. No "simple" shapes.
        2. MATH: Calculate exact CFrame [X,Y,Z, R00,R01,R02...] so parts are perfectly aligned and rotated.
        3. AESTHETICS: Use Materials like 'Neon', 'Metal', 'Glass', 'WoodPlank'. 
        4. SCALE: Use realistic sizes (e.g., a handle is [0.4, 1.2, 0.4], a blade is [0.1, 4, 0.8]).
        5. COLOR: Use professional RGB values (e.g., Gold: [255, 215, 0], Obsidian: [15, 15, 15]).

        Return ONLY a JSON object:
        {"actions": [{"type": "create", "className": "Part", "name": "PartName", "properties": {"CFrame": [x,y,z, 1,0,0,0,1,0,0,0,1], "Size": [w,h,d], "Material": "Metal", "Color": [255,255,255], "Anchored": true}}]}`;

        await page.fill(inputSelector, masterPrompt);
        await page.keyboard.press('Enter');

        await page.waitForSelector('message-content', { timeout: 90000 });
        const responseText = await page.innerText('body');
        await browser.close();
        return responseText;
    } catch (e) {
        console.error("Pro Engine Error:", e.message);
        await browser.close();
        throw e;
    }
}

app.post('/generate', async (req, res) => {
    try {
        console.log("VexOS Pro Building:", req.body.prompt);
        const rawResponse = await askGeminiPro(req.body.prompt);
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            res.header("Content-Type", "application/json").send(jsonMatch[0]);
        } else {
            throw new Error("AI failed to generate Pro JSON");
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`VexOS Pro Online on ${PORT}`));
