const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const app = express();
app.use(express.json());

// وظيفة المحرك الوحيد: Gemini
async function askGemini(prompt) {
    const browser = await chromium.launch({ 
        headless: true, 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ] 
    });
    
    // استخدام ملف الكوكيز الخاص بـ Gemini
    const context = await browser.newContext({ storageState: 'gemini_auth.json' });
    const page = await context.newPage();
    
    try {
        console.log("Navigating to Gemini Engine...");
        // استخدام 'commit' لتسريع الدخول وتجاوز الـ Timeout
        await page.goto('https://gemini.google.com/app', { waitUntil: 'commit', timeout: 90000 });

        const inputSelector = 'div[role="textbox"], [contenteditable="true"]';
        await page.waitForSelector(inputSelector, { timeout: 60000 });
        
        // برومبت مدمج يطلب التخطيط والكود في خطوة واحدة
        const masterPrompt = `Act as a Roblox Developer. For this request: "${prompt}", generate a technical execution JSON. 
        Format requirement: Return ONLY a JSON object. 
        Structure: {"actions": [{"type": "create", "className": "Part", "properties": {"Size": [10,1,10], "Color": [255,0,0]}}]}`;

        await page.fill(inputSelector, masterPrompt);
        await page.keyboard.press('Enter');

        // انتظار رد Gemini
        console.log("Waiting for Gemini response...");
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

// نقطة الاستقبال من روبلوكس
app.post('/generate', async (req, res) => {
    try {
        const userPrompt = req.body.prompt;
        console.log("VexOS Request Received:", userPrompt);
        
        const rawResponse = await askGemini(userPrompt);
        
        // استخراج الـ JSON من نص الاستجابة
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            console.log("JSON extracted successfully.");
            res.header("Content-Type", "application/json");
            res.send(jsonMatch[0]);
        } else {
            throw new Error("Gemini failed to output valid JSON format.");
        }
    } catch (error) {
        console.error("System Crash:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VexOS Solo-Gemini Engine Online on Port ${PORT}`);
});
