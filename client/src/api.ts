import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export interface Event {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'To Do' | 'In Progress' | 'Completed';
    eventId: string;
}

export const api = {
    // Events
    getEvents: () => axios.get<Event[]>(`${API_URL}/events`),
    getEvent: (id: string) => axios.get<Event>(`${API_URL}/events/${id}`),
    createEvent: (data: Omit<Event, 'id'>) => axios.post<Event>(`${API_URL}/events`, data),
    updateEvent: (id: string, data: Partial<Event>) => axios.put<Event>(`${API_URL}/events/${id}`, data),
    deleteEvent: (id: string) => axios.delete(`${API_URL}/events/${id}`),

    // Tasks
    getTasks: (eventId?: string) => axios.get<Task[]>(`${API_URL}/tasks`, { params: { event_id: eventId } }),
    createTask: (data: Omit<Task, 'id'>) => axios.post<Task>(`${API_URL}/tasks`, data),
    updateTask: (id: string, data: Partial<Task>) => axios.put<Task>(`${API_URL}/tasks/${id}`, data),
    deleteTask: (id: string) => axios.delete(`${API_URL}/tasks/${id}`),
};
