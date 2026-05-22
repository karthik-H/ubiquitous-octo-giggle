import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

export const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());

// Types
interface Event {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
}

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'To Do' | 'In Progress' | 'Completed';
    eventId: string;
}

// In-memory data
let events: Event[] = [];
let tasks: Task[] = [];

// --- Event Routes ---

// List all events
app.get('/api/events', (req: Request, res: Response) => {
    res.json(events);
});

// Create event
app.post('/api/events', (req: Request, res: Response) => {
    const { name, description, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: 'Name, startDate, and endDate are required' });
    }
    const newEvent: Event = {
        id: uuidv4(),
        name,
        description,
        startDate,
        endDate
    };
    events.push(newEvent);
    res.status(201).json(newEvent);
});

// Get event by id
app.get('/api/events/:id', (req: Request, res: Response) => {
    const event = events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
});

// Update event
app.put('/api/events/:id', (req: Request, res: Response) => {
    const { name, description, startDate, endDate } = req.body;
    const index = events.findIndex(e => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Event not found' });

    events[index] = { ...events[index], name, description, startDate, endDate };
    res.json(events[index]);
});

// Delete event
app.delete('/api/events/:id', (req: Request, res: Response) => {
    events = events.filter(e => e.id !== req.params.id);
    // Also delete associated tasks
    tasks = tasks.filter(t => t.eventId !== req.params.id);
    res.status(204).send();
});

// --- Task Routes ---

// List tasks (optional query param event_id)
app.get('/api/tasks', (req: Request, res: Response) => {
    const { event_id } = req.query;
    if (event_id) {
        return res.json(tasks.filter(t => t.eventId === event_id));
    }
    res.json(tasks);
});

// Create task
app.post('/api/tasks', (req: Request, res: Response) => {
    const { title, description, status, eventId } = req.body;
    if (!title || !status || !eventId) {
        return res.status(400).json({ error: 'Title, status, and eventId are required' });
    }
    // Verify event exists
    if (!events.find(e => e.id === eventId)) {
        return res.status(400).json({ error: 'Associated event not found' });
    }

    const newTask: Task = {
        id: uuidv4(),
        title,
        description,
        status,
        eventId
    };
    tasks.push(newTask);
    res.status(201).json(newTask);
});

// Update task
app.put('/api/tasks/:id', (req: Request, res: Response) => {
    const { title, description, status, eventId } = req.body;
    const index = tasks.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });

    // If eventId is being changed, verify new event exists
    if (eventId && eventId !== tasks[index].eventId) {
        if (!events.find(e => e.id === eventId)) {
            return res.status(400).json({ error: 'Associated event not found' });
        }
    }

    tasks[index] = { ...tasks[index], title, description, status, eventId: eventId || tasks[index].eventId };
    res.json(tasks[index]);
});

// Delete task
app.delete('/api/tasks/:id', (req: Request, res: Response) => {
    tasks = tasks.filter(t => t.id !== req.params.id);
    res.status(204).send();
});

// Only start the server if this module is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
