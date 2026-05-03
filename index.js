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
        
        const masterPrompt = `Task: "${prompt}". 
        Build a professional Roblox model with 5-15 parts. 
        Use CFrame for alignment. 
        Return ONLY a JSON object. No talking, no explanations. 
        Format: {"actions": [...]}`;

        await page.fill(inputSelector, masterPrompt);
        await page.keyboard.press('Enter');

        await page.waitForSelector('message-content', { timeout: 90000 });
        const responseText = await page.innerText('body');
        await browser.close();
        return responseText;
    } catch (e) {
        await browser.close();
        throw e;
    }
}

// دالة تنظيف النص لاستخراج الـ JSON فقط
function extractJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
}

app.post('/generate', async (req, res) => {
    try {
        console.log("VexOS Pro Request:", req.body.prompt);
        const rawResponse = await askGeminiPro(req.body.prompt);
        const cleanJson = extractJSON(rawResponse);
        
        if (cleanJson) {
            res.header("Content-Type", "application/json").send(cleanJson);
        } else {
            res.status(500).json({ error: "Gemini failed to provide JSON" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`VexOS Pro Online`));
