const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const app = express();
app.use(express.json());

// وظيفة لجلب رد من ChatGPT (Guest Mode) لتجهيز المخطط
async function getArchitectPlan(userPrompt) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://chatgpt.com/', { waitUntil: 'networkidle' });
        
        const architectPrompt = `Act as a Roblox Expert Architect. Breakdown this request: "${userPrompt}" into a structured technical plan. Mention parts, scripts needed, and logic. No code yet.`;
        
        await page.fill('#prompt-textarea', architectPrompt);
        await page.keyboard.press('Enter');
        
        // انتظار الرد (البحث عن عنصر يحتوي على النص)
        await page.waitForSelector('.markdown', { timeout: 30000 });
        const plan = await page.innerText('.markdown');
        
        await browser.close();
        return plan;
    } catch (e) {
        await browser.close();
        return "Fallback Plan: Build basic " + userPrompt;
    }
}

// وظيفة لجلب الكود النهائي من Claude (باستخدام الكوكيز)
async function getCoderResponse(plan) {
    const browser = await chromium.launch({ headless: true });
    // تحميل الكوكيز من الملف الذي ستنشئه في GitHub
    const context = await browser.newContext({ storageState: 'claude_auth.json' });
    const page = await context.newPage();
    
    try {
        await page.goto('https://claude.ai/chats', { waitUntil: 'networkidle' });
        
        const masterPrompt = `Based on this plan: "${plan}", generate a Roblox Execution JSON. 
        Format: {"actions": [{"type": "create", "className": "Part", "name": "Name", "parent": "Workspace", "properties": {}}, {"type": "script", "name": "Logic", "parent": "Name", "source": "code"}]}.
        Return ONLY JSON. No talk.`;

        await page.fill('div[contenteditable="true"]', masterPrompt);
        await page.keyboard.press('Enter');

        // انتظار ظهور الكود (Claude عادة يضع الكود في وسوم pre أو code)
        await page.waitForSelector('pre', { timeout: 60000 });
        const jsonResult = await page.innerText('pre');
        
        await browser.close();
        return jsonResult;
    } catch (e) {
        await browser.close();
        throw new Error("Claude failed or limit reached.");
    }
}

// نقطة الاتصال مع Roblox
app.post('/generate', async (req, res) => {
    const userPrompt = req.body.prompt;
    
    try {
        console.log("Phase 1: Planning with ChatGPT...");
        const plan = await getArchitectPlan(userPrompt);
        
        console.log("Phase 2: Coding with Claude...");
        const finalJson = await getCoderResponse(plan);
        
        // تنظيف النص لضمان أنه JSON نقي
        const cleanJson = finalJson.match(/\{[\s\S]*\}/)[0];
        res.send(cleanJson);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Agent Bridge is online on port ${PORT}`);
});
