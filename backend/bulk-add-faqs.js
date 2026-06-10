const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// ==========================================
// 📝 WRITE YOUR QUESTIONS HERE
// ==========================================
const newQuestions = [
    {
        question: "How do I reset my password?",
        answer: "This is my NEW updated answer! Click the link on the login page.",
        category: "IT",
        tags: "login, updated"
    },
    {
        question: "Where can I find the settings?",
        answer: "Click on your profile picture in the top-right corner and select 'Settings' from the dropdown menu.",
        category: "General",
        tags: "settings, profile, navigation"
    },
    {
        question: "How can I change my name and ID?",
        answer: "Name changes must be requested through HR. Employee IDs are permanent and cannot be changed.",
        category: "HR",
        tags: "profile, identity, hr"
    },
    {
        question: "How can I change the user ID?",
        answer: "User IDs are system-generated and cannot be modified by users. Contact IT Admin for special cases.",
        category: "IT",
        tags: "account, admin, id"
    },
    {
        question: "How do I report a security breach?",
        answer: "Immediately email [security@company.com](mailto:security@company.com) or call the emergency IT hotline at extension 911.",
        category: "Security",
        tags: "security, breach, emergency"
    },
    {
        question: "How do I request a second monitor?",
        answer: "You must have manager approval and submit a ticket to IT Hardware.",
        category: "IT",
        tags: "hardware, screen, request"
    },
    {
        question: "How do I connect to the company VPN?",
        answer: "Download the Cisco AnyConnect client from the software center and use your standard network credentials to log in.",
        category: "IT",
        tags: "vpn, remote work, network"
    },
    {
        question: "How do I request time off or sick leave?",
        answer: "Log into the HR Portal, select 'Leave Management', and submit your request for approval by your manager.",
        category: "HR",
        tags: "leave, vacation, sick days"
    },
    {
        question: "What is the guest Wi-Fi password?",
        answer: "The guest network is 'Company-Guest' and the password is 'Welcome2026!'. Do not share internal Wi-Fi credentials.",
        category: "IT",
        tags: "wifi, internet, guest"
    },
    {
        question: "When are expense reports due?",
        answer: "Expense reports must be submitted by the 25th of each month to be reimbursed in the next pay cycle.",
        category: "Finance",
        tags: "expenses, money, reimbursement"
    },
    {
        question: "How do I add a shared printer?",
        answer: "Open 'Printers & Scanners' in Windows settings, click 'Add a printer', and search for the printer name explicitly (e.g., 'Office-Floor2').",
        category: "IT",
        tags: "printer, hardware, printing"
    },
    {
        question: "Where can I view the holiday calendar?",
        answer: "The official company holiday calendar is available on the Intranet homepage under 'Quick Links' > '2026 Holidays'.",
        category: "HR",
        tags: "holidays, calendar, time off"
    },
    {
        question: "My computer is running very slow, what should I do?",
        answer: "Try restarting your computer first. If the issue persists, clear your browser cache or submit a ticket to the Helpdesk.",
        category: "IT",
        tags: "performance, slow, troubleshooting"
    },
    {
        question: "How do I book a meeting room?",
        answer: "Use the Calendar system in Outlook or Google Workspace. Create a new event and add the room as a resource/location.",
        category: "General",
        tags: "meeting, room booking, calendar"
    },
    {
        question: "What happens if I lose my access badge?",
        answer: "Report lost badges to Security immediately at [security@company.com](mailto:security@company.com). A replacement fee of $20 may apply.",
        category: "Security",
        tags: "badge, access, lost item"
    },
    {
        question: "Can I install my own software on company laptops?",
        answer: "No. All software installations must be approved by IT. Unauthorized software is strictly prohibited.",
        category: "IT",
        tags: "software, install, policy"
    },
    {
        question: "Where do I find my payslips?",
        answer: "Payslips are stored in the 'My Pay' section of the ADP/Workday portal. You can download them as PDFs.",
        category: "Finance",
        tags: "payroll, salary, payslip"
    },
    {
        question: "Who do I contact for benefits enrollment?",
        answer: "Please email the benefits team at [benefits@company.com](mailto:benefits@company.com) or check the 'Benefits Guide' on the HR portal.",
        category: "HR",
        tags: "benefits, insurance, health"
    },
    {
        question: "(Updated) How do I setup email on my phone?",
        answer: "Install the Outlook app and sign in with your company email. You will need to approve the login via the Authenticator app.",
        category: "IT",
        tags: "mobile, email, outlook"
    },
    {
        question: "What is the policy for working from home?",
        answer: "Employees are allowed 2 days of remote work per week, subject to manager approval and team schedules.",
        category: "HR",
        tags: "wfh, remote, policy"
    },
    {
        question: "How do I update my emergency contact info?",
        answer: "Go to your Profile Settings in the HR Portal and edit the 'Emergency Contacts' section.",
        category: "HR",
        tags: "emergency, contact, profile"
    },
    {
        question: "How are overtime payments calculated?",
        answer: "Overtime pay is calculated based on your hourly rate and the number of approved overtime hours worked, according to company policy and applicable labor laws. For payment details, check your payslip or contact the Finance/Payroll team.",
        category: "Finance",
        tags: "Salary, Payments"
    }
];

// ==========================================
// 🛠️ DATABASE INSERTION LOGIC
// ==========================================
async function run() {
    if (newQuestions.length === 0) {
        console.log("❌ No questions found in the array to add.");
        return;
    }

    // 1. Read the connection string from .env file
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error("❌ Error: .env file not found inside the backend directory.");
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const uriLine = envContent.split(/\r?\n/).find(line => line.startsWith('MONGODB_URI='));
    if (!uriLine) {
        console.error("❌ Error: MONGODB_URI not found in your .env file.");
        return;
    }
    const mongoUri = uriLine.split('MONGODB_URI=')[1].trim();

    console.log("🔌 Connecting to MongoDB Atlas...");
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        const db = client.db('FAQNEW');
        const collection = db.collection('FAQNEW');

        // 2. Fetch the highest existing ID to continue the ID sequence
        console.log("🔍 Fetching highest existing ID...");
        const maxDoc = await collection.find({}).sort({ 'data.id': -1 }).limit(1).toArray();
        let nextId = 1;
        if (maxDoc.length > 0 && maxDoc[0].data && maxDoc[0].data.id) {
            nextId = Number(maxDoc[0].data.id) + 1;
        }

        console.log(`🔢 Starting ID sequence at: ${nextId}`);

        // 3. Define the date bounds (Feb 1, 2026 to June 1, 2026)
        const startDate = new Date('2026-02-01T09:00:00Z').getTime();
        const endDate = new Date('2026-06-01T17:00:00Z').getTime();
        const totalItems = newQuestions.length;

        // 4. Format the documents
        const documents = newQuestions.map((item, index) => {
            const currentId = nextId + index;
            const text = `${item.question}\n\n${item.answer}`;

            // Distribute dates from Feb 2026 to June 1, 2026 chronologically
            const itemTime = totalItems > 1 
                ? startDate + ((endDate - startDate) / (totalItems - 1)) * index
                : startDate;
            const itemDate = new Date(itemTime);
            const isoString = itemDate.toISOString();

            return {
                text,
                source: 'blob',
                blobType: 'text/plain',
                data: {
                    id: currentId,
                    question: item.question,
                    answer: item.answer,
                    category: item.category || 'General',
                    frequency: '',
                    tags: item.tags || '',
                    lastUpdated: isoString // ISO format for correct default UI sorting
                },
                createdAt: itemDate,
                updatedAt: itemDate
            };
        });

        // 5. Batch insert
        console.log(`📤 Inserting ${documents.length} questions into FAQNEW collection...`);
        const result = await collection.insertMany(documents);
        console.log(`✅ Success! Successfully added ${result.insertedCount} questions.`);

    } catch (error) {
        console.error("❌ An error occurred during database operations:", error);
    } finally {
        await client.close();
        console.log("🔌 Database connection closed.");
    }
}

run();
