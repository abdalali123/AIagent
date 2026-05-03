const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const app = express();
app.use(express.json());

// المرحلة 1: التخطيط عبر ChatGPT
async function getArchitectPlan(userPrompt) {
    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    try {
        console.log("Phase 1: Navigating to ChatGPT...");
        await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        const inputSelector = '#prompt-textarea';
        await page.waitForSelector(inputSelector, { timeout: 30000 });
        
        await page.fill(inputSelector, `Roblox Expert: Create a technical plan for: "${userPrompt}". Technical steps only.`);
        await page.keyboard.press('Enter');
        
        await page.waitForSelector('.markdown', { timeout: 45000 });
        const plan = await page.innerText('.markdown');
        await browser.close();
        return plan;
    } catch (e) {
        console.error("ChatGPT Error:", e.message);
        await browser.close();
        return "Plan: Build a high-quality structure for " + userPrompt;
    }
}

// المرحلة 2: البرمجة عبر Gemini (مع إصلاحات الـ Timeout والذاكرة)
async function getGeminiCoderResponse(plan) {
    const browser = await chromium.launch({ 
        headless: true, 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // حل مشكلة الذاكرة في الحاويات (Docker)
            '--disable-gpu'
        ] 
    });
    const context = await browser.newContext({ storageState: 'gemini_auth.json' });
    const page = await context.newPage();
    
    try {
        console.log("Phase 2: Navigating to Gemini...");
        // استخدام 'commit' بدلاً من 'networkidle' لتجاوز البطء
        await page.goto('https://gemini.google.com/app', { waitUntil: 'commit', timeout: 90000 });

        const inputSelector = 'div[role="textbox"], [contenteditable="true"]';
        await page.waitForSelector(inputSelector, { timeout: 60000 });
        
        const masterPrompt = `As a Roblox Developer, convert this to JSON: "${plan}". Return ONLY JSON. Format: {"actions": [{"type": "create", "className": "Part", "properties": {"Size": [10,1,10]}}]}`;

        await page.fill(inputSelector, masterPrompt);
        await page.keyboard.press('Enter');

        // الانتظار حتى استلام الرد
        await page.waitForSelector('message-content', { timeout: 60000 });
        const responseText = await page.innerText('body');
        
        await browser.close();
        return responseText;
    } catch (e) {
        console.error("Gemini Engine Error:", e.message);
        await browser.close();
        throw e;
    }
}

// نقطة الاتصال مع Roblox
app.post('/generate', async (req, res) => {
    try {
        console.log("Starting VexOS Pipeline for:", req.body.prompt);
        const plan = await getArchitectPlan(req.body.prompt);
        console.log("Phase 1 Complete.");
        
        const rawResponse = await getGeminiCoderResponse(plan);
        console.log("Phase 2 Complete.");
        
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            res.header("Content-Type", "application/json");
            res.send(jsonMatch[0]);
        } else {
            throw new Error("Invalid AI response format");
        }
    } catch (error) {
        console.error("Final Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VexOS System Online on Port ${PORT}`);
});
