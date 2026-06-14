import React, { useState, useEffect } from 'react';

const HOURS = [
  { value: 0, label: '12:00 AM (Midnight)' },
  { value: 1, label: '1:00 AM' },
  { value: 2, label: '2:00 AM' },
  { value: 3, label: '3:00 AM' },
  { value: 4, label: '4:00 AM' },
  { value: 5, label: '5:00 AM' },
  { value: 6, label: '6:00 AM' },
  { value: 7, label: '7:00 AM' },
  { value: 8, label: '8:00 AM' },
  { value: 9, label: '9:00 AM' },
  { value: 10, label: '10:00 AM' },
  { value: 11, label: '11:00 AM' },
  { value: 12, label: '12:00 PM (Noon)' },
  { value: 13, label: '1:00 PM' },
  { value: 14, label: '2:00 PM' },
  { value: 15, label: '3:00 PM' },
  { value: 16, label: '4:00 PM' },
  { value: 17, label: '5:00 PM' },
  { value: 18, label: '6:00 PM' },
  { value: 19, label: '7:00 PM' },
  { value: 20, label: '8:00 PM' },
  { value: 21, label: '9:00 PM' },
  { value: 22, label: '10:00 PM' },
  { value: 23, label: '11:00 PM' },
];

export default function ITProjectManager({ user, staff = [] }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  // HTML5 Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState('todo');
  const [notes, setNotes] = useState('');

  // Date states
  const [startMode, setStartMode] = useState('today'); // 'today' | 'date'
  const [startDate, setStartDate] = useState('');
  const [startAllDay, setStartAllDay] = useState(true);
  const [startHour, setStartHour] = useState(9); // Default 9:00 AM
  const [startMinute, setStartMinute] = useState(0);

  const [dueMode, setDueMode] = useState('today'); // 'today' | 'date'
  const [dueDate, setDueDate] = useState('');
  const [dueAllDay, setDueAllDay] = useState(true);
  const [dueHour, setDueHour] = useState(17); // Default 5:00 PM
  const [dueMinute, setDueMinute] = useState(0);

  // Error and text states for time input typing
  const [formError, setFormError] = useState('');
  const [startHourInputText, setStartHourInputText] = useState('9:00 AM');
  const [dueHourInputText, setDueHourInputText] = useState('5:00 PM');

  // Helper formatting for YYYY-MM-DD
  const getLocalDateString = (dateObj) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatHourText = (hourVal) => {
    const ampm = hourVal >= 12 ? 'PM' : 'AM';
    let displayHr = hourVal % 12;
    displayHr = displayHr ? displayHr : 12;
    return `${displayHr}:00 ${ampm}`;
  };

  const parseHourText = (text) => {
    if (!text) return null;
    const clean = text.trim().toLowerCase();
    const isPM = clean.includes('pm');
    const isAM = clean.includes('am');
    
    const match = clean.match(/^(\d+)(?::(\d+))?/);
    if (!match) return null;
    
    let hr = parseInt(match[1], 10);
    if (isNaN(hr)) return null;
    
    if (isPM && hr < 12) {
      hr += 12;
    } else if (isAM && hr === 12) {
      hr = 0;
    } else if (!isAM && !isPM && hr === 12) {
      hr = 12;
    }
    
    if (hr >= 0 && hr <= 23) {
      return hr;
    }
    return null;
  };

  // Fetch tasks from NestJS backend
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/it-tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching IT tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Set default assignee when modal opens
  useEffect(() => {
    if (showAddModal && staff.length > 0 && !assigneeId) {
      const self = staff.find(s => s.employee_id === user?.employee_id);
      setAssigneeId(self ? self.employee_id : staff[0].employee_id);
    }
  }, [showAddModal, staff, user]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('todo');
    setNotes('');
    setStartMode('today');
    setStartDate(getLocalDateString(new Date()));
    setStartAllDay(true);
    
    // Default to current hour + 1 for start hour, and current hour + 2 for due hour to avoid starting in the past
    const currentHour = new Date().getHours();
    const nextStartHour = currentHour < 23 ? currentHour + 1 : 23;
    const nextDueHour = nextStartHour < 23 ? nextStartHour + 1 : 23;

    setStartHour(nextStartHour);
    setStartHourInputText(formatHourText(nextStartHour));
    setDueMode('today');
    setDueDate(getLocalDateString(new Date()));
    setDueAllDay(true);
    setDueHour(nextDueHour);
    setDueHourInputText(formatHourText(nextDueHour));
    setFormError('');

    if (staff.length > 0) {
      const self = staff.find(s => s.employee_id === user?.employee_id);
      setAssigneeId(self ? self.employee_id : staff[0].employee_id);
    }
  };

  const getAvailableStartHours = (isEdit = false, currentVal = null) => {
    const isTodaySelected = startMode === 'today' || (startDate === getLocalDateString(new Date()));
    if (isTodaySelected) {
      const currentHour = new Date().getHours();
      return HOURS.filter(h => h.value >= currentHour || (isEdit && h.value === currentVal));
    }
    return HOURS;
  };

  const getAvailableDueHours = (isEdit = false, currentVal = null) => {
    const isDueToday = dueMode === 'today' || (dueDate === getLocalDateString(new Date()));
    const isSameDay = (dueMode === 'today' && startMode === 'today') ||
                      (startDate && dueDate && startDate === dueDate) ||
                      (dueMode === 'today' && startDate === getLocalDateString(new Date())) ||
                      (startMode === 'today' && dueDate === getLocalDateString(new Date()));

    if (isSameDay && !startAllDay) {
      return HOURS.filter(h => h.value > startHour || (isEdit && h.value === currentVal));
    } else if (isDueToday) {
      const currentHour = new Date().getHours();
      return HOURS.filter(h => h.value >= currentHour || (isEdit && h.value === currentVal));
    }
    return HOURS;
  };

  const getAvailableStartMinutes = (isEdit = false, currentVal = null) => {
    const isTodaySelected = startMode === 'today' || (startDate === getLocalDateString(new Date()));
    const currentHour = new Date().getHours();
    if (isTodaySelected && startHour === currentHour) {
      const currentMinute = new Date().getMinutes();
      return Array.from({ length: 60 }, (_, i) => i).filter(m => m >= currentMinute || (isEdit && m === currentVal));
    }
    return Array.from({ length: 60 }, (_, i) => i);
  };

  const getAvailableDueMinutes = (isEdit = false, currentVal = null) => {
    const isSameDay = (dueMode === 'today' && startMode === 'today') || 
                      (startDate && dueDate && startDate === dueDate) ||
                      (dueMode === 'today' && startDate === getLocalDateString(new Date())) ||
                      (startMode === 'today' && dueDate === getLocalDateString(new Date()));
    
    if (isSameDay && startHour === dueHour) {
      return Array.from({ length: 60 }, (_, i) => i).filter(m => m > startMinute || (isEdit && m === currentVal));
    }

    const isDueToday = dueMode === 'today' || (dueDate === getLocalDateString(new Date()));
    const currentHour = new Date().getHours();
    if (isDueToday && dueHour === currentHour) {
      const currentMinute = new Date().getMinutes();
      return Array.from({ length: 60 }, (_, i) => i).filter(m => m >= currentMinute || (isEdit && m === currentVal));
    }

    return Array.from({ length: 60 }, (_, i) => i);
  };



  const constructDate = (mode, dateStr, isAllDay, hourVal, minuteVal = 0, isDue = false) => {
    let baseDate;
    if (mode === 'today') {
      baseDate = new Date();
    } else {
      if (!dateStr) {
        baseDate = new Date();
      } else {
        const parts = dateStr.split('-');
        baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    }
    
    if (isAllDay) {
      if (isDue) {
        baseDate.setHours(23, 59, 59, 999);
      } else {
        baseDate.setHours(0, 0, 0, 0);
      }
    } else {
      baseDate.setHours(hourVal, minuteVal, 0, 0);
    }
    return baseDate;
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title || !assigneeId) {
      setFormError('Please fill out all required fields.');
      return;
    }

    let parsedStartHour = startHour;
    if (!startAllDay) {
      const parsed = parseHourText(startHourInputText);
      if (parsed === null) {
        setFormError('Invalid start hour format. Please use e.g. "9:00 AM", "2 PM", or "14".');
        return;
      }
      parsedStartHour = parsed;
    }

    let parsedDueHour = dueHour;
    if (!dueAllDay) {
      const parsed = parseHourText(dueHourInputText);
      if (parsed === null) {
        setFormError('Invalid deadline hour format. Please use e.g. "5:00 PM", "6 PM", or "17".');
        return;
      }
      parsedDueHour = parsed;
    }

    const calculatedStart = constructDate(startMode, startDate, startAllDay, parsedStartHour, startMinute, false);
    const calculatedDue = constructDate(dueMode, dueDate, dueAllDay, parsedDueHour, dueMinute, true);
    const now = new Date();

    // Enforce that new tasks cannot start in the past
    if (startAllDay) {
      const startDay = new Date(calculatedStart);
      startDay.setHours(0, 0, 0, 0);
      const todayDay = new Date();
      todayDay.setHours(0, 0, 0, 0);
      if (startDay.getTime() < todayDay.getTime()) {
        setFormError('The start date cannot be in the past.');
        return;
      }
    } else {
      if (calculatedStart.getTime() < now.getTime() - 60000) {
        setFormError('The start date and time cannot be in the past.');
        return;
      }
    }

    // Enforce deadline is after start date/time
    if (calculatedDue.getTime() <= calculatedStart.getTime()) {
      setFormError('The deadline (due date/time) must be after the start date and time.');
      return;
    }

    const assignee = staff.find(s => s.employee_id === assigneeId) || { name: 'Unknown' };

    const payload = {
      title,
      description,
      assigneeId,
      assigneeName: assignee.name,
      startDate: calculatedStart,
      dueDate: calculatedDue,
      startAllDay,
      dueAllDay,
      status,
      notes,
    };

    try {
      const res = await fetch('http://localhost:3000/it-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdTask = await res.json();
        setTasks(prev => [...prev, createdTask]);
        setShowAddModal(false);
        resetForm();
        fetchTasks();
      } else {
        setFormError('Failed to create task.');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      setFormError('An error occurred while creating the task.');
    }
  };

  const handleOpenEdit = (task) => {
    setFormError('');
    setSelectedTask(task);
    setTitle(task.title || '');
    setDescription(task.description || '');
    setAssigneeId(task.assigneeId || '');
    setStatus(task.status || 'todo');
    setNotes(task.notes || '');

    const startD = new Date(task.startDate);
    const dueD = new Date(task.dueDate);
    const isStartToday = startD.toDateString() === new Date().toDateString();
    const isDueToday = dueD.toDateString() === new Date().toDateString();

    setStartMode(isStartToday ? 'today' : 'date');
    setStartDate(getLocalDateString(startD));
    setStartAllDay(task.startAllDay ?? true);
    setStartHour(startD.getHours());
    setStartHourInputText(formatHourText(startD.getHours()));
    setStartMinute(startD.getMinutes());

    setDueMode(isDueToday ? 'today' : 'date');
    setDueDate(getLocalDateString(dueD));
    setDueAllDay(task.dueAllDay ?? true);
    setDueHour(dueD.getHours());
    setDueHourInputText(formatHourText(dueD.getHours()));
    setDueMinute(dueD.getMinutes());

    setShowEditModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (!title || !assigneeId) {
      setFormError('Please fill out all required fields.');
      return;
    }

    let parsedStartHour = startHour;
    if (!startAllDay) {
      const parsed = parseHourText(startHourInputText);
      if (parsed === null) {
        setFormError('Invalid start hour format. Please use e.g. "9:00 AM", "2 PM", or "14".');
        return;
      }
      parsedStartHour = parsed;
    }

    let parsedDueHour = dueHour;
    if (!dueAllDay) {
      const parsed = parseHourText(dueHourInputText);
      if (parsed === null) {
        setFormError('Invalid deadline hour format. Please use e.g. "5:00 PM", "6 PM", or "17".');
        return;
      }
      parsedDueHour = parsed;
    }

    const calculatedStart = constructDate(startMode, startDate, startAllDay, parsedStartHour, startMinute, false);
    const calculatedDue = constructDate(dueMode, dueDate, dueAllDay, parsedDueHour, dueMinute, true);
    const now = new Date();

    // If start date was changed to a new date, check if it's in the past (only if it wasn't already in the past)
    const originalStart = new Date(selectedTask.startDate);
    const hasStartChanged = calculatedStart.getTime() !== originalStart.getTime();

    if (hasStartChanged) {
      if (startAllDay) {
        const startDay = new Date(calculatedStart);
        startDay.setHours(0, 0, 0, 0);
        const todayDay = new Date();
        todayDay.setHours(0, 0, 0, 0);
        if (startDay.getTime() < todayDay.getTime()) {
          setFormError('The start date cannot be in the past.');
          return;
        }
      } else {
        if (calculatedStart.getTime() < now.getTime() - 60000) {
          setFormError('The start date and time cannot be in the past.');
          return;
        }
      }
    }

    // Enforce deadline is after start date/time
    if (calculatedDue.getTime() <= calculatedStart.getTime()) {
      setFormError('The deadline (due date/time) must be after the start date and time.');
      return;
    }

    const assignee = staff.find(s => s.employee_id === assigneeId) || { name: selectedTask.assigneeName };

    const payload = {
      title,
      description,
      assigneeId,
      assigneeName: assignee.name,
      startDate: calculatedStart,
      dueDate: calculatedDue,
      startAllDay,
      dueAllDay,
      status,
      notes,
    };

    try {
      const res = await fetch(`http://localhost:3000/it-tasks/${selectedTask._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
        setShowEditModal(false);
        setSelectedTask(null);
        resetForm();
        fetchTasks();
      } else {
        setFormError('Failed to update task.');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      setFormError('An error occurred while updating the task.');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedTask.title}"?`)) return;

    try {
      const res = await fetch(`http://localhost:3000/it-tasks/${selectedTask._id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowEditModal(false);
        setSelectedTask(null);
        resetForm();
        fetchTasks();
      } else {
        setFormError('Failed to delete task.');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // ── HTML5 Drag & Drop ──
  const handleDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task._id, sourceStatus: task.status }));
    // Adding class with timeout to allow native drag ghost to render properly
    setTimeout(() => {
      setDraggedTaskId(task._id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== col) {
      setDragOverColumn(col);
    }
  };

  const handleDragLeave = (e, col) => {
    e.preventDefault();
    if (dragOverColumn === col) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, col) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      
      const { taskId, sourceStatus } = JSON.parse(dataStr);
      if (!taskId || sourceStatus === col) {
        setDraggedTaskId(null);
        return;
      }
      
      setDraggedTaskId(null);

      const taskIndex = tasks.findIndex(t => t._id === taskId);
      if (taskIndex !== -1) {
        // Optimistic update
        setTasks(prev => prev.map(t =>
          t._id === taskId
            ? { ...t, status: col, completedDate: col === 'done' ? new Date().toISOString() : null }
            : t
        ));
        // Persist to backend
        fetch(`http://localhost:3000/it-tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: col }),
        }).then(res => {
          if (!res.ok) throw new Error();
          fetchTasks();
        }).catch(() => {
          fetchTasks();
        });
      }
    } catch (err) {
      console.error("Drop error", err);
      setDraggedTaskId(null);
    }
  };

  // Helper date calculations
  const getDaysDiff = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    date1.setHours(0,0,0,0);
    date2.setHours(0,0,0,0);
    const diffTime = date2 - date1;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTaskStatusLabel = (task) => {
    if (task.status === 'done') {
      return { text: 'Done', class: 'badge-teal' };
    }
    const today = new Date();
    const due = new Date(task.dueDate);
    const start = new Date(task.startDate);

    if (task.status === 'in-progress') {
      if (due.getTime() < today.getTime()) {
        return { text: 'Overdue', class: 'badge-red' };
      }
      return { text: 'In Progress', class: 'badge-teal' };
    }

    if (start.getTime() > today.getTime()) {
      return { text: 'Scheduled', class: 'badge-grey' };
    }
    if (due.getTime() < today.getTime()) {
      return { text: 'Overdue', class: 'badge-red' };
    }
    return { text: 'To Do', class: 'badge-grey' };
  };

  const getRemainingText = (task) => {
    if (task.status === 'done') {
      if (task.completedDate) {
        const complDate = new Date(task.completedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        return `Completed on ${complDate}`;
      }
      return 'Completed';
    }

    const now = new Date();
    const due = new Date(task.dueDate);
    const start = new Date(task.startDate);

    const msToStart = start.getTime() - now.getTime();
    const msToDue = due.getTime() - now.getTime();

    // If scheduled in the future
    if (msToStart > 0) {
      if (task.startAllDay) {
        const startDiffDays = getDaysDiff(now, start);
        if (startDiffDays === 0) {
          return 'Starts today';
        } else if (startDiffDays === 1) {
          return 'Starts tomorrow';
        } else {
          return `Starts in ${startDiffDays} days`;
        }
      }
      const mins = Math.ceil(msToStart / (1000 * 60));
      if (mins < 60) {
        return `Starts in ${mins} min${mins !== 1 ? 's' : ''}`;
      }
      const hours = Math.ceil(msToStart / (1000 * 60 * 60));
      if (hours < 24) {
        return `Starts in ${hours} hr${hours !== 1 ? 's' : ''}`;
      }
      const days = Math.round(msToStart / (1000 * 60 * 60 * 24));
      return `Starts in ${days} day${days !== 1 ? 's' : ''}`;
    }

    // If overdue
    if (msToDue < 0) {
      if (task.dueAllDay) {
        const dueDiffDays = getDaysDiff(due, now);
        if (dueDiffDays === 0) {
          return 'Overdue';
        }
        return `Overdue by ${dueDiffDays} day${dueDiffDays !== 1 ? 's' : ''}`;
      }
      const absMs = Math.abs(msToDue);
      const mins = Math.floor(absMs / (1000 * 60));
      if (mins < 60) {
        if (mins === 0) return 'Overdue by <1 min';
        return `Overdue by ${mins} min${mins !== 1 ? 's' : ''}`;
      }
      const hours = Math.floor(absMs / (1000 * 60 * 60));
      if (hours < 24) {
        return `Overdue by ${hours} hr${hours !== 1 ? 's' : ''}`;
      }
      const days = Math.round(absMs / (1000 * 60 * 60 * 24));
      return `Overdue by ${days} day${days !== 1 ? 's' : ''}`;
    }

    // If due today / soon
    if (task.dueAllDay) {
      const dueDiffDays = getDaysDiff(now, due);
      if (dueDiffDays === 0) {
        return 'Due today';
      } else if (dueDiffDays === 1) {
        return 'Due tomorrow';
      } else {
        return `${dueDiffDays} days left`;
      }
    }

    const minsLeft = Math.floor(msToDue / (1000 * 60));
    if (minsLeft < 60) {
      if (minsLeft === 0) return 'Due in <1 min!';
      return `Due in ${minsLeft} min${minsLeft !== 1 ? 's' : ''}!`;
    }
    const hoursLeft = Math.floor(msToDue / (1000 * 60 * 60));
    if (hoursLeft < 24) {
      return `Due in ${hoursLeft} hr${hoursLeft !== 1 ? 's' : ''}`;
    }
    
    const daysLeft = Math.round(msToDue / (1000 * 60 * 60 * 24));
    return `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
  };

  const formatTaskDate = (dateString, isAllDay) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    if (isAllDay) return datePart;
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${datePart} @ ${hours}:${minutes} ${ampm}`;
  };

  // Filters & Counts
  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(search.toLowerCase()) ||
      task.assigneeName.toLowerCase().includes(search.toLowerCase());
    
    const matchesAssignee = filterAssignee === 'all' || task.assigneeId === filterAssignee;

    return matchesSearch && matchesAssignee;
  });

  const totalCount = tasks.length;
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const today = new Date();
  const overdueCount = tasks.filter(t => t.status !== 'done' && new Date(t.dueDate).getTime() < today.getTime()).length;

  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* ── Progress & Quick Stats ── */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Progress Card */}
        <div className="metric-card" style={{ flex: '2 1 340px', minWidth: '320px', position: 'relative', overflow: 'hidden' }}>
          <div className="metric-label">Overall Completion Goal</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
            <span className="metric-value">{progressPercent}%</span>
            <span className="metric-sub" style={{ color: 'var(--navy-mid)' }}>
              ({doneCount} of {totalCount} tasks complete)
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'var(--grey-light)', borderRadius: '99px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: progressPercent === 100 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' :
                          progressPercent >= 75 ? 'linear-gradient(90deg, #0ea5e9 0%, var(--teal) 100%)' :
                          progressPercent >= 35 ? 'linear-gradient(90deg, #f59e0b 0%, #eab308 100%)' :
                          'linear-gradient(90deg, var(--red) 0%, #f43f5e 100%)',
              borderRadius: '99px',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>

        {/* Small metrics cards */}
        <div className="metric-card solid-todo" style={{ flex: '1 1 120px' }}>
          <div className="metric-label">To Do</div>
          <div className="metric-value">{todoCount}</div>
          <div className="metric-sub">Pending tasks</div>
        </div>

        <div className="metric-card solid-inprogress" style={{ flex: '1 1 120px' }}>
          <div className="metric-label">In Progress</div>
          <div className="metric-value">{inProgressCount}</div>
          <div className="metric-sub">Active tasks</div>
        </div>

        <div className="metric-card solid-done" style={{ flex: '1 1 120px' }}>
          <div className="metric-label">Completed</div>
          <div className="metric-value">{doneCount}</div>
          <div className="metric-sub">Finished tasks</div>
        </div>

        <div className="metric-card solid-overdue" style={{
          flex: '1 1 120px',
          opacity: overdueCount > 0 ? 1 : 0.85
        }}>
          <div className="metric-label">Overdue</div>
          <div className="metric-value">{overdueCount}</div>
          <div className="metric-sub">
            {overdueCount > 0 ? 'Urgent attention!' : 'No delayed tasks'}
          </div>
        </div>
      </div>

      {/* ── Toolbar / Controls ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'white',
        padding: '16px 20px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--grey-light)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search tasks, descriptions or assigned team members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: '32px', paddingRight: '12px',
              height: '36px', border: '1.5px solid var(--grey-light)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--navy)',
              background: 'var(--off-white)', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Assigned To Filter */}
        <select
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
          style={{
            height: '36px', border: '1.5px solid var(--grey-light)', borderRadius: 'var(--radius-sm)',
            padding: '0 12px', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--navy)',
            background: 'white', cursor: 'pointer', outline: 'none', minWidth: '180px'
          }}
        >
          <option value="all">Filter by Assigned To</option>
          {staff.map(emp => (
            <option key={emp.employee_id} value={emp.employee_id}>
              {emp.name}
            </option>
          ))}
        </select>

        {/* Add Task Button */}
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="btn btn-primary"
          style={{ height: '36px', marginLeft: 'auto' }}
        >
          <span>+ Add Task</span>
        </button>
      </div>

      {/* Native drag handling replaces custom overlays */}

      {/* ── Kanban Columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* TO DO COLUMN */}
        <div
          className={`it-column-container ${dragOverColumn === 'todo' ? 'drag-over-todo' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'todo')}
          onDragLeave={(e) => handleDragLeave(e, 'todo')}
          onDrop={(e) => handleDrop(e, 'todo')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--navy-mid)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
              To Do
            </h3>
            <span style={{ fontSize: '0.78rem', background: '#e2e8f0', color: 'var(--navy-mid)', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>
              {filteredTasks.filter(t => t.status === 'todo').length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '350px' }}>
            {filteredTasks.filter(t => t.status === 'todo').map(task => (
              <TaskCard key={task._id} task={task} onOpen={handleOpenEdit} getRemainingText={getRemainingText} getTaskStatusLabel={getTaskStatusLabel} formatTaskDate={formatTaskDate} getInitials={getInitials} onDragStart={(e) => handleDragStart(e, task)} onDragEnd={handleDragEnd} isDragging={draggedTaskId === task._id} />
            ))}
            {filteredTasks.filter(t => t.status === 'todo').length === 0 && (
              <div className={`kanban-empty-slot ${dragOverColumn === 'todo' ? 'kanban-empty-slot-active' : ''}`}>
                {dragOverColumn === 'todo' ? '✦ Drop here' : 'Drag tasks here'}
              </div>
            )}
          </div>
        </div>

        {/* IN PROGRESS COLUMN */}
        <div
          className={`it-column-container ${dragOverColumn === 'in-progress' ? 'drag-over-inprogress' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'in-progress')}
          onDragLeave={(e) => handleDragLeave(e, 'in-progress')}
          onDrop={(e) => handleDrop(e, 'in-progress')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9', display: 'inline-block' }} />
              In Progress
            </h3>
            <span style={{ fontSize: '0.78rem', background: '#bae6fd', color: '#0284c7', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>
              {filteredTasks.filter(t => t.status === 'in-progress').length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '350px' }}>
            {filteredTasks.filter(t => t.status === 'in-progress').map(task => (
              <TaskCard key={task._id} task={task} onOpen={handleOpenEdit} getRemainingText={getRemainingText} getTaskStatusLabel={getTaskStatusLabel} formatTaskDate={formatTaskDate} getInitials={getInitials} onDragStart={(e) => handleDragStart(e, task)} onDragEnd={handleDragEnd} isDragging={draggedTaskId === task._id} />
            ))}
            {filteredTasks.filter(t => t.status === 'in-progress').length === 0 && (
              <div className={`kanban-empty-slot ${dragOverColumn === 'in-progress' ? 'kanban-empty-slot-active' : ''}`}>
                {dragOverColumn === 'in-progress' ? '✦ Drop here' : 'Drag tasks here'}
              </div>
            )}
          </div>
        </div>

        {/* COMPLETED COLUMN */}
        <div
          className={`it-column-container ${dragOverColumn === 'done' ? 'drag-over-done' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'done')}
          onDragLeave={(e) => handleDragLeave(e, 'done')}
          onDrop={(e) => handleDrop(e, 'done')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--teal-dim)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
              Completed
            </h3>
            <span style={{ fontSize: '0.78rem', background: '#bbf7d0', color: 'var(--teal)', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>
              {filteredTasks.filter(t => t.status === 'done').length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '350px' }}>
            {filteredTasks.filter(t => t.status === 'done').map(task => (
              <TaskCard key={task._id} task={task} onOpen={handleOpenEdit} getRemainingText={getRemainingText} getTaskStatusLabel={getTaskStatusLabel} formatTaskDate={formatTaskDate} getInitials={getInitials} onDragStart={(e) => handleDragStart(e, task)} onDragEnd={handleDragEnd} isDragging={draggedTaskId === task._id} />
            ))}
            {filteredTasks.filter(t => t.status === 'done').length === 0 && (
              <div className={`kanban-empty-slot ${dragOverColumn === 'done' ? 'kanban-empty-slot-active' : ''}`}>
                {dragOverColumn === 'done' ? '✦ Drop here' : 'Drag tasks here'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Task Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal" style={{ width: '640px' }}>
            <div className="modal-title" style={{ fontFamily: 'inherit' }}>Create New IT Task</div>
            <div className="modal-sub" style={{ fontFamily: 'inherit' }}>Schedule a new job, assign it to an employee, and define dates.</div>
            
            <form onSubmit={handleCreateTask}>
              {formError && (
                <div className="login-error-alert" style={{ marginBottom: '16px', marginTop: '4px' }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  <span style={{ fontWeight: 600 }}>{formError}</span>
                </div>
              )}

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Task Title <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Migration of database server"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setFormError(''); }}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Description</label>
                <textarea
                  rows="3"
                  placeholder="What needs to be accomplished?"
                  value={description}
                  onChange={e => { setDescription(e.target.value); setFormError(''); }}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              {/* Unified Scheduling Panel */}
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '12px',
                border: '1.5px solid var(--grey-light)',
                padding: '16px',
                borderRadius: '12px',
                background: '#fafbfc',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}>
                {/* Left Column: Start Date & Time */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, padding: '12px', borderRadius: '12px', background: !startAllDay ? 'rgba(5, 151, 148, 0.03)' : 'transparent', border: !startAllDay ? '1px solid rgba(5, 151, 148, 0.12)' : '1px solid transparent', transition: 'all 0.25s ease', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--navy-mid)', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                    Start Date & Time
                  </label>
                  
                  <CustomDatePicker
                    value={startDate}
                    onChange={val => {
                      setStartDate(val);
                      setStartMode('date');
                      setFormError('');
                      if (dueDate && val > dueDate) {
                        setDueDate(val);
                      }
                    }}
                    minDate={getLocalDateString(new Date())}
                    startDate={startDate}
                    dueDate={dueDate}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <label className="custom-checkbox-container">
                      <input
                        type="checkbox"
                        checked={startAllDay}
                        onChange={e => setStartAllDay(e.target.checked)}
                        style={{ position: 'absolute', opacity: 0, cursor: 'pointer', height: 0, width: 0 }}
                      />
                      <div className="custom-checkbox-box">
                        {startAllDay && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 4 7 9 1" />
                          </svg>
                        )}
                      </div>
                      <span>All Day</span>
                    </label>
                  </div>

                  {!startAllDay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <CustomHourInput
                        value={startHourInputText}
                        onChange={val => { setStartHourInputText(val); setFormError(''); }}
                        options={getAvailableStartHours()}
                        placeholder="Hour"
                      />
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--navy-mid)', margin: '0 4px' }}>:</span>
                      <div className="time-number-input-container">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={String(startMinute).padStart(2, '0')}
                          onChange={e => { 
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            setStartMinute(Math.max(0, Math.min(59, val))); 
                            setFormError(''); 
                          }}
                          className="time-number-input"
                        />
                        <div className="custom-spinner-container">
                          <button
                            type="button"
                            onClick={() => { setStartMinute(prev => (prev < 59 ? prev + 1 : 0)); setFormError(''); }}
                            className="custom-spinner-btn"
                            style={{ borderBottom: '0.5px solid var(--grey-light)' }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => { setStartMinute(prev => (prev > 0 ? prev - 1 : 59)); setFormError(''); }}
                            className="custom-spinner-btn"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Middle Arrow Connector */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>

                {/* Right Column: Due Date & Time */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, padding: '12px', borderRadius: '12px', background: !dueAllDay ? 'rgba(5, 151, 148, 0.03)' : 'transparent', border: !dueAllDay ? '1px solid rgba(5, 151, 148, 0.12)' : '1px solid transparent', transition: 'all 0.25s ease', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--navy-mid)', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                    Due Date & Time
                  </label>

                  <CustomDatePicker
                    value={dueDate}
                    onChange={val => {
                      setDueDate(val);
                      setDueMode('date');
                      setFormError('');
                      if (startDate && val < startDate) {
                        setStartDate(val);
                      }
                    }}
                    minDate={startMode === 'today' ? getLocalDateString(new Date()) : startDate}
                    startDate={startDate}
                    dueDate={dueDate}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <label className="custom-checkbox-container">
                      <input
                        type="checkbox"
                        checked={dueAllDay}
                        onChange={e => setDueAllDay(e.target.checked)}
                        style={{ position: 'absolute', opacity: 0, cursor: 'pointer', height: 0, width: 0 }}
                      />
                      <div className="custom-checkbox-box">
                        {dueAllDay && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 4 7 9 1" />
                          </svg>
                        )}
                      </div>
                      <span>All Day</span>
                    </label>
                  </div>

                  {!dueAllDay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <CustomHourInput
                        value={dueHourInputText}
                        onChange={val => { setDueHourInputText(val); setFormError(''); }}
                        options={getAvailableDueHours()}
                        placeholder="Hour"
                      />
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--navy-mid)', margin: '0 4px' }}>:</span>
                      <div className="time-number-input-container">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={String(dueMinute).padStart(2, '0')}
                          onChange={e => { 
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            setDueMinute(Math.max(0, Math.min(59, val))); 
                            setFormError(''); 
                          }}
                          className="time-number-input"
                        />
                        <div className="custom-spinner-container">
                          <button
                            type="button"
                            onClick={() => { setDueMinute(prev => (prev < 59 ? prev + 1 : 0)); setFormError(''); }}
                            className="custom-spinner-btn"
                            style={{ borderBottom: '0.5px solid var(--grey-light)' }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDueMinute(prev => (prev > 0 ? prev - 1 : 59)); setFormError(''); }}
                            className="custom-spinner-btn"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Assign To <span className="required-asterisk">*</span></label>
                <select
                  required
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1.5px solid var(--grey-light)',
                    borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--off-white)',
                    fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--navy)', cursor: 'pointer'
                  }}
                >
                  {staff.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.department || 'No Department'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1.5px solid var(--grey-light)',
                    borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--off-white)',
                    fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--navy)', cursor: 'pointer'
                  }}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              <div className="modal-btns">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Task Modal ── */}
      {showEditModal && selectedTask && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal" style={{ width: '640px' }}>
            <div className="modal-title" style={{ fontFamily: 'inherit' }}>Edit IT Task</div>
            <div className="modal-sub" style={{ fontFamily: 'inherit' }}>Update task status, reschedule dates, or log notes.</div>
            
            <form onSubmit={handleUpdateTask}>
              {formError && (
                <div className="login-error-alert" style={{ marginBottom: '16px', marginTop: '4px' }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  <span style={{ fontWeight: 600 }}>{formError}</span>
                </div>
              )}

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Task Title <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Migration of database server"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setFormError(''); }}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Description</label>
                <textarea
                  rows="3"
                  placeholder="What needs to be accomplished?"
                  value={description}
                  onChange={e => { setDescription(e.target.value); setFormError(''); }}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              {/* Unified Scheduling Panel */}
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '12px',
                border: '1.5px solid var(--grey-light)',
                padding: '16px',
                borderRadius: '12px',
                background: '#fafbfc',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}>
                {/* Left Column: Start Date & Time */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, padding: '12px', borderRadius: '12px', background: !startAllDay ? 'rgba(5, 151, 148, 0.03)' : 'transparent', border: !startAllDay ? '1px solid rgba(5, 151, 148, 0.12)' : '1px solid transparent', transition: 'all 0.25s ease', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--navy-mid)', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                    Start Date & Time
                  </label>
                  
                  <CustomDatePicker
                    value={startDate}
                    onChange={val => {
                      setStartDate(val);
                      setStartMode('date');
                      setFormError('');
                      if (dueDate && val > dueDate) {
                        setDueDate(val);
                      }
                    }}
                    minDate={selectedTask && new Date(selectedTask.startDate) < new Date() ? getLocalDateString(new Date(selectedTask.startDate)) : getLocalDateString(new Date())}
                    startDate={startDate}
                    dueDate={dueDate}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <label className="custom-checkbox-container">
                      <input
                        type="checkbox"
                        checked={startAllDay}
                        onChange={e => setStartAllDay(e.target.checked)}
                        style={{ position: 'absolute', opacity: 0, cursor: 'pointer', height: 0, width: 0 }}
                      />
                      <div className="custom-checkbox-box">
                        {startAllDay && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 4 7 9 1" />
                          </svg>
                        )}
                      </div>
                      <span>All Day</span>
                    </label>
                  </div>

                  {!startAllDay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <CustomHourInput
                        value={startHourInputText}
                        onChange={val => { setStartHourInputText(val); setFormError(''); }}
                        options={getAvailableStartHours(true, selectedTask ? new Date(selectedTask.startDate).getHours() : null)}
                        placeholder="Hour"
                      />
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--navy-mid)', margin: '0 4px' }}>:</span>
                      <div className="time-number-input-container">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={String(startMinute).padStart(2, '0')}
                          onChange={e => { 
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            setStartMinute(Math.max(0, Math.min(59, val))); 
                            setFormError(''); 
                          }}
                          className="time-number-input"
                        />
                        <div className="custom-spinner-container">
                          <button
                            type="button"
                            onClick={() => { setStartMinute(prev => (prev < 59 ? prev + 1 : 0)); setFormError(''); }}
                            className="custom-spinner-btn"
                            style={{ borderBottom: '0.5px solid var(--grey-light)' }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => { setStartMinute(prev => (prev > 0 ? prev - 1 : 59)); setFormError(''); }}
                            className="custom-spinner-btn"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Middle Arrow Connector */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>

                {/* Right Column: Due Date & Time */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, padding: '12px', borderRadius: '12px', background: !dueAllDay ? 'rgba(5, 151, 148, 0.03)' : 'transparent', border: !dueAllDay ? '1px solid rgba(5, 151, 148, 0.12)' : '1px solid transparent', transition: 'all 0.25s ease', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--navy-mid)', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                    Due Date & Time
                  </label>

                  <CustomDatePicker
                    value={dueDate}
                    onChange={val => {
                      setDueDate(val);
                      setDueMode('date');
                      setFormError('');
                      if (startDate && val < startDate) {
                        setStartDate(val);
                      }
                    }}
                    minDate={startMode === 'today' ? (selectedTask && new Date(selectedTask.startDate) < new Date() ? getLocalDateString(new Date(selectedTask.startDate)) : getLocalDateString(new Date())) : startDate}
                    startDate={startDate}
                    dueDate={dueDate}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <label className="custom-checkbox-container">
                      <input
                        type="checkbox"
                        checked={dueAllDay}
                        onChange={e => setDueAllDay(e.target.checked)}
                        style={{ position: 'absolute', opacity: 0, cursor: 'pointer', height: 0, width: 0 }}
                      />
                      <div className="custom-checkbox-box">
                        {dueAllDay && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 4 7 9 1" />
                          </svg>
                        )}
                      </div>
                      <span>All Day</span>
                    </label>
                  </div>

                  {!dueAllDay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <CustomHourInput
                        value={dueHourInputText}
                        onChange={val => { setDueHourInputText(val); setFormError(''); }}
                        options={getAvailableDueHours(true, selectedTask ? new Date(selectedTask.dueDate).getHours() : null)}
                        placeholder="Hour"
                      />
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--navy-mid)', margin: '0 4px' }}>:</span>
                      <div className="time-number-input-container">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={String(dueMinute).padStart(2, '0')}
                          onChange={e => { 
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            setDueMinute(Math.max(0, Math.min(59, val))); 
                            setFormError(''); 
                          }}
                          className="time-number-input"
                        />
                        <div className="custom-spinner-container">
                          <button
                            type="button"
                            onClick={() => { setDueMinute(prev => (prev < 59 ? prev + 1 : 0)); setFormError(''); }}
                            className="custom-spinner-btn"
                            style={{ borderBottom: '0.5px solid var(--grey-light)' }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDueMinute(prev => (prev > 0 ? prev - 1 : 59)); setFormError(''); }}
                            className="custom-spinner-btn"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Assign To <span className="required-asterisk">*</span></label>
                <select
                  required
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1.5px solid var(--grey-light)',
                    borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--off-white)',
                    fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--navy)', cursor: 'pointer'
                  }}
                >
                  {staff.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.department || 'No Department'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1.5px solid var(--grey-light)',
                    borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--off-white)',
                    fontFamily: 'inherit', fontSize: '0.875rem', color: 'var(--navy)', cursor: 'pointer'
                  }}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              <div className="modal-field">
                <label style={{ fontFamily: 'inherit' }}>Notes / Work Logs</label>
                <textarea
                  rows="2"
                  placeholder="Notes, issues encountered, details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              <div className="modal-btns" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-outline-red" onClick={handleDeleteTask} style={{ marginRight: 'auto', flex: '0 0 auto' }}>
                  Delete
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End modals */}
    </div>
  );
}

// Sub-Component: TaskCard
function TaskCard({ task, onOpen, getRemainingText, getTaskStatusLabel, formatTaskDate, getInitials, onDragStart, onDragEnd, isDragging }) {
  const remainingText = getRemainingText(task);
  const isOverdue = !task.completedDate && (new Date(task.dueDate).getTime() < new Date().getTime());

  // Dynamic colors for avatar background based on initial
  const getAvatarGradient = (name) => {
    if (!name) return 'linear-gradient(135deg, #64748b, #475569)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Indigo
      'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', // Sky
      'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Pink
      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // Violet
      'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', // Rose
      'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', // Teal
    ];
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  // Modern soft badge style helper
  const getBadgeStyle = (status, isOverdue) => {
    if (isOverdue) {
      return { background: 'rgba(253, 45, 48, 0.1)', color: 'var(--red)', border: '1px solid rgba(253, 45, 48, 0.2)' };
    }
    switch (status) {
      case 'done':
        return { background: 'rgba(20, 184, 166, 0.1)', color: 'var(--teal-dim)', border: '1px solid rgba(20, 184, 166, 0.2)' };
      case 'in-progress':
        return { background: 'rgba(14, 165, 233, 0.1)', color: '#0369a1', border: '1px solid rgba(14, 165, 233, 0.2)' };
      default:
        return { background: 'rgba(100, 116, 139, 0.15)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };
    }
  };

  const badgeText = isOverdue ? 'Overdue' : (task.status === 'done' ? 'Completed' : (task.status === 'in-progress' ? 'In Progress' : 'To Do'));

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      className={`it-task-card status-${task.status} ${isOverdue ? 'is-overdue' : ''} ${isDragging ? 'is-dragging' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
        <h4>
          {task.title}
        </h4>
        <span className="badge" style={{ fontSize: '0.7rem', padding: '3px 8px', flexShrink: 0, borderRadius: '6px', fontWeight: 700, ...getBadgeStyle(task.status, isOverdue) }}>
          {badgeText}
        </span>
      </div>

      {task.description && (
        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </p>
      )}

      {/* Dates/Timings */}
      <div className="it-task-meta-row">
        <div className="it-task-meta-item">
          <svg className="it-task-meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Scheduled: <strong style={{ color: 'var(--navy)' }}>{formatTaskDate(task.startDate, task.startAllDay)}</strong></span>
        </div>
        <div className="it-task-meta-item">
          <svg className="it-task-meta-icon" style={{ color: isOverdue ? 'var(--red)' : 'var(--grey)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ color: isOverdue ? 'var(--red)' : 'inherit' }}>
            Deadline: <strong style={{ color: isOverdue ? 'var(--red)' : 'var(--navy)' }}>{formatTaskDate(task.dueDate, task.dueAllDay)}</strong>
          </span>
        </div>
      </div>

      {/* Footer info: Assigned to badge and remaining time */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(15, 23, 42, 0.06)',
        paddingTop: '10px',
        marginTop: '2px'
      }}>
        {/* Assigned to */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={`Assigned to ${task.assigneeName}`}>
          <div className="it-avatar-circle" style={{ background: getAvatarGradient(task.assigneeName) }}>
            {getInitials(task.assigneeName)}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy-mid)' }}>
            {task.assigneeName.split(' ')[0]}
          </span>
        </div>

        {/* Days/hours remaining or overdue */}
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: isOverdue ? 'var(--red)' : (task.status === 'done' ? 'var(--teal-dim)' : 'var(--navy-mid)')
        }}>
          {remainingText}
        </span>
      </div>
    </div>
  );
}

function CustomDatePicker({ value, onChange, minDate, startDate, dueDate }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  const getDayRangeStatus = (day) => {
    if (!startDate || !dueDate) return { isStart: false, isEnd: false, isBetween: false };
    const currentDayDate = new Date(year, month, day);
    currentDayDate.setHours(0,0,0,0);

    const partsStart = startDate.split('-');
    const startDObj = new Date(Number(partsStart[0]), Number(partsStart[1]) - 1, Number(partsStart[2]));
    startDObj.setHours(0,0,0,0);

    const partsDue = dueDate.split('-');
    const dueDObj = new Date(Number(partsDue[0]), Number(partsDue[1]) - 1, Number(partsDue[2]));
    dueDObj.setHours(0,0,0,0);

    const time = currentDayDate.getTime();
    const startTime = startDObj.getTime();
    const dueTime = dueDObj.getTime();

    const isStart = time === startTime;
    const isEnd = time === dueTime;
    const isBetween = time > startTime && time < dueTime;

    return { isStart, isEnd, isBetween };
  };

  const initialDate = parseDate(value);
  const [viewDate, setViewDate] = useState(initialDate);

  useEffect(() => {
    if (value) {
      setViewDate(parseDate(value));
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const totalDays = getDaysInMonth(year, month);
  const startOffset = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSelectDay = (day) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dStr);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const isDayDisabled = (day) => {
    if (!minDate) return false;
    const currentDayDate = new Date(year, month, day);
    const parts = minDate.split('-');
    const minDayDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    currentDayDate.setHours(0,0,0,0);
    minDayDate.setHours(0,0,0,0);
    return currentDayDate < minDayDate;
  };

  const isDaySelected = (day) => {
    if (!value) return false;
    const parts = value.split('-');
    return Number(parts[0]) === year && Number(parts[1]) === (month + 1) && Number(parts[2]) === day;
  };

  const getFormattedValue = () => {
    if (!value) return 'Select a date';
    const dateObj = parseDate(value);
    return dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const containerRef = React.useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '10px 14px',
          border: '1.5px solid var(--grey-light)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          color: 'var(--navy)',
          background: 'var(--off-white)',
          cursor: 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(5, 151, 148, 0.15)' : 'none',
          borderColor: isOpen ? 'var(--teal)' : 'var(--grey-light)'
        }}
        className="custom-datepicker-trigger"
      >
        <span>{getFormattedValue()}</span>
        <svg style={{ width: '16px', height: '16px', color: 'var(--navy-mid)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          background: 'white',
          border: '1.5px solid var(--grey-light)',
          borderRadius: '12px',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12), 0 8px 10px rgba(0, 0, 0, 0.04)',
          width: '280px',
          padding: '16px',
          boxSizing: 'border-box',
          zIndex: 1000,
          fontFamily: 'inherit'
        }}
        className="custom-datepicker-popover"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button 
              type="button" 
              onClick={prevMonth}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem',
                color: 'var(--navy-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '50%', transition: 'all 0.15s ease'
              }}
              className="calendar-nav-btn"
            >
              &larr;
            </button>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>
              {monthsList[month]} {year}
            </span>
            <button 
              type="button" 
              onClick={nextMonth}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem',
                color: 'var(--navy-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '50%', transition: 'all 0.15s ease'
              }}
              className="calendar-nav-btn"
            >
              &rarr;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(day => (
              <span key={day} style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--grey)', letterSpacing: '0.5px' }}>
                {day}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px 0px', textAlign: 'center' }}>
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} style={{ width: '100%', height: '34px' }} />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const dNum = i + 1;
              const disabled = isDayDisabled(dNum);
              const selected = isDaySelected(dNum);

              // Only show the connecting range highlight if BOTH dates are selected and they are DIFFERENT
              const hasValidRange = startDate && dueDate && startDate !== dueDate;
              const { isStart, isEnd, isBetween } = hasValidRange 
                ? getDayRangeStatus(dNum) 
                : { isStart: false, isEnd: false, isBetween: false };
              
              const colIndex = (startOffset + dNum - 1) % 7;

              let rangeElStyle = null;
              if (!disabled && (isStart || isEnd || isBetween)) {
                rangeElStyle = {
                  position: 'absolute',
                  top: '1px',
                  bottom: '1px',
                  left: '0px',
                  right: '0px',
                  background: 'rgba(5, 151, 148, 0.08)',
                  borderTop: '1.5px solid var(--teal)',
                  borderBottom: '1.5px solid var(--teal)',
                  zIndex: 1,
                  pointerEvents: 'none'
                };

                if (isStart) {
                  rangeElStyle.left = 'calc(50% - 16px)';
                  rangeElStyle.borderLeft = '1.5px solid var(--teal)';
                  rangeElStyle.borderTopLeftRadius = '16px';
                  rangeElStyle.borderBottomLeftRadius = '16px';
                  if (colIndex === 6) {
                    rangeElStyle.right = 'calc(50% - 16px)';
                    rangeElStyle.borderRight = '1.5px solid var(--teal)';
                    rangeElStyle.borderTopRightRadius = '16px';
                    rangeElStyle.borderBottomRightRadius = '16px';
                  }
                } else if (isEnd) {
                  rangeElStyle.right = 'calc(50% - 16px)';
                  rangeElStyle.borderRight = '1.5px solid var(--teal)';
                  rangeElStyle.borderTopRightRadius = '16px';
                  rangeElStyle.borderBottomRightRadius = '16px';
                  if (colIndex === 0) {
                    rangeElStyle.left = 'calc(50% - 16px)';
                    rangeElStyle.borderLeft = '1.5px solid var(--teal)';
                    rangeElStyle.borderTopLeftRadius = '16px';
                    rangeElStyle.borderBottomLeftRadius = '16px';
                  }
                } else if (isBetween) {
                  if (colIndex === 0) {
                    rangeElStyle.left = 'calc(50% - 16px)';
                    rangeElStyle.borderLeft = '1.5px solid var(--teal)';
                    rangeElStyle.borderTopLeftRadius = '16px';
                    rangeElStyle.borderBottomLeftRadius = '16px';
                  }
                  if (colIndex === 6) {
                    rangeElStyle.right = 'calc(50% - 16px)';
                    rangeElStyle.borderRight = '1.5px solid var(--teal)';
                    rangeElStyle.borderTopRightRadius = '16px';
                    rangeElStyle.borderBottomRightRadius = '16px';
                  }
                }
              }

              return (
                <div 
                  key={`cell-${dNum}`} 
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  {rangeElStyle && <div style={rangeElStyle} />}
                  <button
                    key={`day-${dNum}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDay(dNum)}
                    style={{
                      background: selected ? 'var(--teal)' : 'none',
                      border: 'none',
                      color: selected ? 'white' : (disabled ? '#cbd5e1' : 'var(--navy)'),
                      cursor: disabled ? 'default' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: selected ? 700 : 500,
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: 'auto',
                      opacity: disabled ? 0.35 : 1,
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      zIndex: 2
                    }}
                    className={!disabled && !selected ? 'calendar-day-btn' : ''}
                  >
                    {dNum}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '12px' }}>
            <button 
              type="button" 
              onClick={handleClear}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem',
                fontWeight: 700, color: 'var(--navy-mid)', textTransform: 'uppercase', letterSpacing: '0.5px',
                padding: '4px 8px'
              }}
            >
              Clear
            </button>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'var(--teal)', border: 'none', borderRadius: '24px', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 700, color: 'white', textTransform: 'uppercase',
                letterSpacing: '0.5px', padding: '6px 16px', boxShadow: '0 4px 10px rgba(5, 151, 148, 0.25)'
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomHourInput({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (label) => {
    onChange(label);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', flex: 1, minWidth: '95px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            height: '36px',
            border: '1.5px solid var(--grey-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '0 24px 0 10px',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            fontWeight: '600',
            background: 'white',
            color: 'var(--navy)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.2s ease',
            borderColor: isOpen ? 'var(--teal)' : 'var(--grey-light)',
            boxShadow: isOpen ? '0 0 0 3px rgba(5, 151, 148, 0.15)' : 'none',
          }}
        />
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            color: 'var(--navy-mid)',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ▼
        </div>
      </div>

      {isOpen && options.length > 0 && (
        <div
          className="custom-hour-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1.5px solid var(--grey-light)',
            borderRadius: '8px',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.1), 0 4px 6px rgba(0, 0, 0, 0.03)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxSizing: 'border-box',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              className="hour-option"
              onClick={() => handleSelect(opt.label)}
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
