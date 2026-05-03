const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const app = express();
app.use(express.json());

// المرحلة الأولى: التخطيط عبر ChatGPT
async function getArchitectPlan(userPrompt) {
    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    try {
        await page.goto('https://chatgpt.com/', { waitUntil: 'networkidle' });
        const inputSelector = '#prompt-textarea';
        await page.waitForSelector(inputSelector);
        
        await page.fill(inputSelector, `Roblox Expert: Create a technical plan for: "${userPrompt}". Focus on parts and logic.`);
        await page.keyboard.press('Enter');
        
        await page.waitForSelector('.markdown', { timeout: 45000 });
        const plan = await page.innerText('.markdown');
        await browser.close();
        return plan;
    } catch (e) {
        console.error("ChatGPT Error:", e.message);
        await browser.close();
        return "Plan: Create detailed parts for " + userPrompt;
    }
}

// المرحلة الثانية: البرمجة عبر Claude
async function getCoderResponse(plan) {
    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const context = await browser.newContext({ storageState: 'claude_auth.json' });
    const page = await context.newPage();
    
    try {
        await page.goto('https://claude.ai/chats', { waitUntil: 'networkidle' });
        const inputSelector = 'div[contenteditable="true"]';
        await page.waitForSelector(inputSelector);
        
        const masterPrompt = `Based on: "${plan}", generate Roblox JSON actions ONLY. 
        Format: {"actions": [{"type": "create", "className": "Part", "name": "AI_Part", "properties": {"Color": [0,255,0]}}]}. 
        No conversational text.`;
        
        await page.fill(inputSelector, masterPrompt);
        await page.keyboard.press('Enter');

        await page.waitForSelector('pre, code', { timeout: 60000 });
        const jsonResult = await page.innerText('pre, code');
        await browser.close();
        return jsonResult;
    } catch (e) {
        console.error("Claude Error:", e.message);
        await browser.close();
        throw e;
    }
}

// نقطة الاتصال مع روبلوكس
app.post('/generate', async (req, res) => {
    try {
        console.log("Receiving Request:", req.body.prompt);
        const plan = await getArchitectPlan(req.body.prompt);
        const finalJson = await getCoderResponse(plan);
        
        // استخراج الـ JSON فقط من رد Claude
        const cleanJson = finalJson.match(/\{[\s\S]*\}/)[0];
        res.header("Content-Type", "application/json");
        res.send(cleanJson);
    } catch (error) {
        console.error("Server Crash:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VexOS System Active on Port ${PORT}`);
});
