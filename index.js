const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const app = express();
app.use(express.json());

// المرحلة الأولى: التخطيط (ChatGPT) - تبقى كما هي لأنها تعمل جيداً كـ Guest
async function getArchitectPlan(userPrompt) {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        const inputSelector = '#prompt-textarea';
        await page.waitForSelector(inputSelector, { timeout: 30000 });
        await page.fill(inputSelector, `Roblox Expert: Plan for "${userPrompt}". Technical steps only.`);
        await page.keyboard.press('Enter');
        
        await page.waitForSelector('.markdown', { timeout: 45000 });
        const plan = await page.innerText('.markdown');
        await browser.close();
        return plan;
    } catch (e) {
        await browser.close();
        return "Plan: Build a detailed Roblox structure for: " + userPrompt;
    }
}

// المرحلة الثانية: توليد الكود باستخدام Gemini (بدلاً من Claude)
async function getGeminiCoderResponse(plan) {
    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const context = await browser.newContext({ storageState: 'gemini_auth.json' });
    const page = await context.newPage();
    
    try {
        await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle', timeout: 60000 });
        
        // Selector الخاص بمربع نص Gemini
        const inputSelector = 'div[role="textbox"], .textarea, rich-textarea > div';
        await page.waitForSelector(inputSelector, { timeout: 45000 });
        
        const masterPrompt = `As a Roblox Developer, convert this plan into a JSON: "${plan}". 
        Requirement: Return ONLY a JSON object.
        Format: {"actions": [{"type": "create", "className": "Part", "name": "AI_Part", "properties": {"Material": "Neon", "Size": [10,1,10]}}]}`;

        await page.fill(inputSelector, masterPrompt);
        await page.keyboard.press('Enter');

        // انتظار رد Gemini (عادة يظهر في وسوم الـ code أو داخل الـ response containers)
        await page.waitForSelector('.model-response-text, code', { timeout: 60000 });
        const responseText = await page.innerText('body');
        
        await browser.close();
        return responseText;
    } catch (e) {
        console.error("Gemini Engine Error:", e.message);
        await browser.close();
        throw e;
    }
}

app.post('/generate', async (req, res) => {
    try {
        console.log("Starting VexOS Pipeline for:", req.body.prompt);
        
        const plan = await getArchitectPlan(req.body.prompt);
        console.log("Phase 1 Complete.");
        
        const rawResponse = await getGeminiCoderResponse(plan);
        console.log("Phase 2 Complete.");
        
        // استخراج الـ JSON من نص Gemini
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            res.header("Content-Type", "application/json");
            res.send(jsonMatch[0]);
        } else {
            throw new Error("Gemini didn't return valid JSON");
        }
    } catch (error) {
        console.error("System Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VexOS Gemini-Engine Online on Port ${PORT}`);
});
