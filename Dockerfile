FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# تثبيت التبعيات البرمجية
COPY package*.json ./
RUN npm install

# تثبيت متصفح Chromium مع مكتبات النظام الضرورية
RUN npx playwright install --with-deps chromium

COPY . .

# إعداد المنفذ ليتوافق مع Railway
ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
