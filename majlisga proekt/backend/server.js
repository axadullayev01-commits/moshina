const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// File storage path
const LEADS_FILE = path.join(__dirname, 'leads.json');

// Ensure leads.json exists
if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2));
}

// Routes
app.get('/', (req, res) => {
    res.send('Car Damage Estimator API is running...');
});

// GET /api/leads - Get all leads
app.get('/api/leads', (req, res) => {
    try {
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        const leads = JSON.parse(data);
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read leads' });
    }
});

// POST /api/leads - Create a new lead
app.post('/api/leads', async (req, res) => {
    const { name, phone, model, parts, total, summary } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
    }

    const newLead = {
        id: Date.now(),
        name,
        phone,
        model,
        parts,
        total,
        summary,
        createdAt: new Date().toISOString()
    };

    try {
        // 1. Save to local file
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        const leads = JSON.parse(data);
        leads.unshift(newLead); // Add to beginning
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));

        // 2. Send to Telegram
        const message = formatTelegramMessage(newLead);
        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });

        res.status(201).json({ success: true, lead: newLead });
    } catch (error) {
        console.error('Error processing lead:', error.message);
        res.status(500).json({ error: 'Failed to process lead' });
    }
});

// Helper: Format Telegram Message
function formatTelegramMessage(lead) {
    let message = `🚀 *Yangi Buyurtma (Estimate)*\n\n`;
    message += `👤 *Mijoz:* ${lead.name}\n`;
    message += `📞 *Telefon:* ${lead.phone}\n`;
    message += `🚗 *Mashina:* ${lead.model}\n\n`;
    
    message += `🛠 *Tanlangan detallar:* \n`;
    lead.parts.forEach((part, index) => {
        message += `${index + 1}. ${part.name} (${part.status === 'repair' ? "Ta'mirlash" : "Almashtirish"})\n`;
    });
    
    message += `\n💰 *Jami narx:* $${lead.total}\n\n`;
    message += `🕒 *Vaqt:* ${new Date(lead.createdAt).toLocaleString('uz-UZ')}`;
    
    return message;
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
