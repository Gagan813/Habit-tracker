const express = require('express');
const WebSocket = require('ws');
const cron = require('node-cron');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// In-memory storage for habits
let habits = [];

// WebSocket Server
const wss = new WebSocket.Server({ port: 3001 });
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  ws.send('Connected to Smart Habit Tracker!');
});

// Add Habit
app.post('/habits', (req, res) => {
  const { name, daily_goal } = req.body;
  if (!name || !daily_goal) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const habit = { id: habits.length + 1, name, daily_goal, completion_dates: [] };
  habits.push(habit);
  res.status(201).json({ message: 'Habit added', habit });
});

// Update Habit
app.put('/habits/:id', (req, res) => {
  const { id } = req.params;
  const today = new Date().toISOString().split('T')[0]; // Get today's date
  const habit = habits.find((h) => h.id === parseInt(id));

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  if (!habit.completion_dates.includes(today)) {
    habit.completion_dates.push(today);
  }

  res.status(200).json({ message: 'Habit updated for today', habit });
});

// Get Habits
app.get('/habits', (req, res) => {
  res.status(200).json(habits);
});

// Weekly Report
app.get('/habits/report', (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDate = sevenDaysAgo.toISOString().split('T')[0];

  const report = habits.map((habit) => {
    const completions = habit.completion_dates.filter((date) => date >= startDate).length;
    return { name: habit.name, completions };
  });

  res.status(200).json(report);
});

// Daily Notifications
cron.schedule('0 8 * * *', () => { // Runs every day at 8 AM
  habits.forEach((habit) => {
    const today = new Date().toISOString().split('T')[0];
    const completedToday = habit.completion_dates.includes(today);

    if (!completedToday) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`Reminder: Complete your habit "${habit.name}" today!`);
        }
      });
    }
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
