import React, { useState, useEffect } from 'react';
import { api } from './api';
import type { Event, Task } from './api';
import { Plus, Calendar, ListChecks, Trash2, Edit3, X, ArrowLeft, CheckCircle2, Clock, PlayCircle } from 'lucide-react';

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [eventForm, setEventForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'To Do' as Task['status'] });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTasks(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      console.log('Fetching events...');
      const res = await api.getEvents();
      console.log('Events fetched:', res.data);
      setEvents(res.data);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchTasks = async (eventId: string) => {
    try {
      console.log(`Fetching tasks for event ${eventId}...`);
      const res = await api.getTasks(eventId);
      console.log('Tasks fetched:', res.data);
      setTasks(res.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const handleCreateOrUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      await api.updateEvent(editingEvent.id, eventForm);
    } else {
      await api.createEvent(eventForm);
    }
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setEventForm({ name: '', description: '', startDate: '', endDate: '' });
    fetchEvents();
  };

  const handleCreateOrUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (editingTask) {
      await api.updateTask(editingTask.id, { ...taskForm, eventId: selectedEvent.id });
    } else {
      await api.createTask({ ...taskForm, eventId: selectedEvent.id });
    }
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setTaskForm({ title: '', description: '', status: 'To Do' });
    fetchTasks(selectedEvent.id);
  };

  const deleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure? This will delete all associated tasks.')) {
      await api.deleteEvent(id);
      fetchEvents();
      if (selectedEvent?.id === id) setSelectedEvent(null);
    }
  };

  const deleteTask = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.deleteTask(id);
      if (selectedEvent) fetchTasks(selectedEvent.id);
    }
  };

  const openEditEvent = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setEventForm({ name: event.name, description: event.description, startDate: event.startDate, endDate: event.endDate });
    setIsEventModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({ title: task.title, description: task.description, status: task.status });
    setIsTaskModalOpen(true);
  };

  return (
    <div className="container">
      <header className="animate-in">
        <div>
          <h1>{selectedEvent ? selectedEvent.name : 'Events Dashboard'}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {selectedEvent ? 'Manage tasks for this event' : 'Plan and track your upcoming events'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {selectedEvent && (
            <button className="secondary" onClick={() => setSelectedEvent(null)}>
              <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} />
              Back
            </button>
          )}
          <button onClick={() => selectedEvent ? setIsTaskModalOpen(true) : setIsEventModalOpen(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Add {selectedEvent ? 'Task' : 'Event'}
          </button>
        </div>
      </header>

      {!selectedEvent ? (
        <div className="grid">
          {events.map((event, idx) => (
            <div
              key={event.id}
              className="glass event-card animate-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
              onClick={() => setSelectedEvent(event)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3>{event.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Edit3 size={16} className="text-muted" style={{ cursor: 'pointer' }} onClick={(e) => openEditEvent(event, e)} />
                  <Trash2 size={16} style={{ color: 'var(--error)', cursor: 'pointer' }} onClick={(e) => deleteEvent(event.id, e)} />
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>{event.description}</p>
              <div className="dates">
                <Calendar size={14} />
                <span>{new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="glass" style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No events found. Click "Add Event" to get started.
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in">
          <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h4>Event Details</h4>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{selectedEvent.description}</p>
            <div className="dates" style={{ marginTop: '1rem' }}>
              <Calendar size={14} />
              <span>{new Date(selectedEvent.startDate).toLocaleDateString()} - {new Date(selectedEvent.endDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListChecks size={18} />
              <h3 style={{ fontSize: '1.1rem' }}>Tasks</h3>
            </div>
            <div>
              {tasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span className={`badge badge-${task.status.toLowerCase().replace(' ', '')}`}>
                        {task.status === 'Completed' && <CheckCircle2 size={12} style={{ marginRight: '4px' }} />}
                        {task.status === 'In Progress' && <PlayCircle size={12} style={{ marginRight: '4px' }} />}
                        {task.status === 'To Do' && <Clock size={12} style={{ marginRight: '4px' }} />}
                        {task.status}
                      </span>
                      <h4 style={{ fontWeight: 600 }}>{task.title}</h4>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{task.description}</p>
                  </div>
                  <div className="task-actions">
                    <button className="secondary" style={{ padding: '0.5rem' }} onClick={() => openEditTask(task)}>
                      <Edit3 size={16} />
                    </button>
                    <button className="secondary" style={{ padding: '0.5rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => deleteTask(task.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tasks for this event yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="modal-overlay">
          <div className="glass modal-content animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>{editingEvent ? 'Edit Event' : 'Create Event'}</h2>
              <X style={{ cursor: 'pointer' }} onClick={() => { setIsEventModalOpen(false); setEditingEvent(null); }} />
            </div>
            <form onSubmit={handleCreateOrUpdateEvent}>
              <label>Event Name</label>
              <input
                type="text"
                required
                value={eventForm.name}
                onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="Team Retreat 2024"
              />
              <label>Description</label>
              <textarea
                rows={3}
                value={eventForm.description}
                onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Details about the event..."
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    required
                    value={eventForm.startDate}
                    onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input
                    type="date"
                    required
                    value={eventForm.endDate}
                    onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" style={{ width: '100%', marginTop: '1rem' }}>
                {editingEvent ? 'Update' : 'Create'} Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="glass modal-content animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>{editingTask ? 'Edit Task' : 'Add Task'}</h2>
              <X style={{ cursor: 'pointer' }} onClick={() => { setIsTaskModalOpen(false); setEditingTask(null); }} />
            </div>
            <form onSubmit={handleCreateOrUpdateTask}>
              <label>Task Title</label>
              <input
                type="text"
                required
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Finalize catering menu"
              />
              <label>Description</label>
              <textarea
                rows={2}
                value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Additional notes..."
              />
              <label>Status</label>
              <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as any })}>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <button type="submit" style={{ width: '100%', marginTop: '1rem' }}>
                {editingTask ? 'Update' : 'Add'} Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
