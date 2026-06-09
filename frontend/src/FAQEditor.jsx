import React, { useState, useEffect } from 'react';

// Helper function to format the FAQ updated date as: "9th Jun 26, 7:20pm"
const formatFAQDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  try {
    let date = new Date(dateStr);
    
    // Parse custom format like "Sep 2, 26   6:13:59 PM" or "14/4/26 11:39:12"
    if (isNaN(date.getTime())) {
      const cleanStr = dateStr.replace(/\s+/g, ' ');
      date = new Date(cleanStr);
    }
    
    // Fallback parser for DD/MM/YY formats
    if (isNaN(date.getTime())) {
      const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const month = parseInt(dmyMatch[2]) - 1;
        let year = parseInt(dmyMatch[3]);
        if (year < 100) year += 2000;
        
        let hour = 12, min = 0;
        const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1]);
          min = parseInt(timeMatch[2]);
        }
        date = new Date(year, month, day, hour, min);
      }
    }

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    const day = date.getDate();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day} ${monthName} ${year}, ${hours}:${minutes}${ampm}`;
  } catch (e) {
    return dateStr;
  }
};


export default function FAQEditor() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');

  // Inline add state
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [addQuestion, setAddQuestion] = useState('');
  const [addAnswer, setAddAnswer] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addTags, setAddTags] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Toast Notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Helper to parse dates for sorting
  const getFAQTimestamp = (faq) => {
    const dateStr = faq.data?.lastUpdated;
    if (!dateStr) return 0;
    try {
      let date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
      // Fallback parser for DD/MM/YY or DD/MM/YYYY
      const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const month = parseInt(dmyMatch[2]) - 1;
        let year = parseInt(dmyMatch[3]);
        if (year < 100) year += 2000;
        return new Date(year, month, day).getTime();
      }
    } catch (e) {}
    return 0;
  };

  const fetchFaqs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3000/auth/faq');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to load FAQs');
      }
      const data = await res.json();
      setFaqs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load FAQs. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleStartAdd = () => {
    setIsAddingInline(true);
    setEditingId(null); // Close any edit form
    setAddQuestion('');
    setAddAnswer('');
    setAddCategory('');
    setAddTags('');
    setError(null);
  };

  const handleCancelAdd = () => {
    setIsAddingInline(false);
  };

  const handleStartEdit = (faq) => {
    setIsAddingInline(false); // Close add form
    setEditingId(faq._id);
    setEditQuestion(faq.data?.question || faq.text?.split('\n\n')[0] || '');
    setEditAnswer(faq.data?.answer || faq.text?.split('\n\n')[1] || faq.text || '');
    setEditCategory(faq.data?.category || 'General');
    setEditTags(faq.data?.tags || '');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!addQuestion.trim() || !addAnswer.trim()) {
      showToast('Question and Answer are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:3000/auth/faq/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: addQuestion,
          answer: addAnswer,
          category: addCategory,
          tags: addTags,
        }),
      });

      if (!res.ok) throw new Error('Failed to save FAQ');

      showToast('Question added successfully!', 'success');
      setIsAddingInline(false);
      fetchFaqs();
    } catch (err) {
      showToast(err.message || 'Error saving FAQ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    if (!editQuestion.trim() || !editAnswer.trim()) {
      showToast('Question and Answer are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:3000/auth/faq/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          question: editQuestion,
          answer: editAnswer,
          category: editCategory,
          tags: editTags,
        }),
      });

      if (!res.ok) throw new Error('Failed to save FAQ');

      showToast('Question updated successfully!', 'success');
      setEditingId(null);
      fetchFaqs();
    } catch (err) {
      showToast(err.message || 'Error saving FAQ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, questionText) => {
    if (!window.confirm(`Are you sure you want to permanently delete the FAQ: "${questionText.substring(0, 40)}..."?`)) {
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/auth/faq/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error();
      showToast('Question deleted successfully!', 'success');
      fetchFaqs();
    } catch {
      showToast('Failed to delete FAQ. Is the backend running?', 'error');
    }
  };

  // Get unique categories for dropdown
  const categories = [...new Set(faqs.map(faq => faq.data?.category || 'General').filter(Boolean))].sort();

  // Filter & Search FAQs
  const filteredFaqs = faqs.filter(faq => {
    const q = searchQuery.toLowerCase();
    const faqQ = (faq.data?.question || '').toLowerCase();
    const faqA = (faq.data?.answer || '').toLowerCase();
    const faqT = (faq.data?.tags || '').toLowerCase();
    const faqText = (faq.text || '').toLowerCase();

    const matchesSearch = !q || faqQ.includes(q) || faqA.includes(q) || faqT.includes(q) || faqText.includes(q);
    const matchesCategory = filterCategory === 'all' || (faq.data?.category || 'General') === filterCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="table-wrap" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="table-header" style={{ flexShrink: 0 }}>
          <h3>Knowledge Base Entries</h3>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={fetchFaqs} disabled={loading} style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
              {loading ? '↺ Loading…' : '↺ Refresh'}
            </button>
            <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '7px 14px' }} onClick={handleStartAdd}>
              + Add FAQ
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          padding: '10px 20px',
          borderBottom: '1px solid var(--grey-light)',
          background: '#fafbfc',
          flexShrink: 0
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search FAQs by question, answer, or tags…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', paddingLeft: '30px', paddingRight: '10px',
                height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px',
                fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)',
                background: 'white', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category Filter */}
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)} 
            style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}
          >
            <option value="all" style={{ color: '#059794', fontWeight: 'bold' }}>All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Clear Filters */}
          {(searchQuery || filterCategory !== 'all') && (
            <button 
              onClick={() => { setSearchQuery(''); setFilterCategory('all'); }} 
              style={{ height: '32px', padding: '0 12px', border: '1.5px solid #e2e8f0', borderRadius: '6px', background: 'white', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}
            >
              × Clear
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--grey)', whiteSpace: 'nowrap' }}>
            {filteredFaqs.length} of {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {error && (
          <div style={{ padding: '16px 20px', color: 'var(--red)', fontSize: '0.85rem', background: 'rgba(253,45,48,0.06)', borderBottom: '1px solid rgba(253,45,48,0.15)', flexShrink: 0 }}>
            ⚠ {error}
          </div>
        )}

        {/* FAQs List container */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
          
          {/* Inline Add Record Card */}
          {isAddingInline && (
            <form onSubmit={handleCreateSubmit} style={{
              background: '#f8fafc',
              border: '2px dashed #059794',
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', background: '#059794', padding: '5px 12px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  NEW QUESTION
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 600 }}>Category:</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT, HR, Finance"
                    value={addCategory}
                    onChange={e => setAddCategory(e.target.value)}
                    style={{
                      height: '34px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                      fontSize: '0.9rem', fontFamily: 'inherit', color: 'var(--navy)', width: '160px', boxSizing: 'border-box',
                      outline: 'none', background: 'white',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#059794';
                      e.target.style.boxShadow = '0 0 0 3px rgba(5, 151, 148, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--grey)', marginBottom: '4px', textTransform: 'uppercase' }}>Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I request a second monitor?"
                  value={addQuestion}
                  onChange={e => setAddQuestion(e.target.value)}
                  style={{
                    width: '100%', height: '34px', padding: '0 10px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                    fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit', color: 'var(--navy)', boxSizing: 'border-box',
                    outline: 'none', background: 'white',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#059794';
                    e.target.style.boxShadow = '0 0 0 3px rgba(5, 151, 148, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--grey)', marginBottom: '4px', textTransform: 'uppercase' }}>Answer</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide the detailed resolution here..."
                  value={addAnswer}
                  onChange={e => setAddAnswer(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                    fontSize: '0.85rem', lineHeight: '1.4', fontFamily: 'inherit', color: 'var(--navy-mid)',
                    boxSizing: 'border-box', resize: 'vertical',
                    outline: 'none', background: 'white',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#059794';
                    e.target.style.boxShadow = '0 0 0 3px rgba(5, 151, 148, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 200px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--navy)', fontWeight: 600 }}>Tags:</span>
                  <input
                    type="text"
                    placeholder="comma-separated tags (e.g. wifi, hardware)"
                    value={addTags}
                    onChange={e => setAddTags(e.target.value)}
                    style={{
                      height: '28px', padding: '0 8px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                      fontSize: '0.8rem', fontFamily: 'inherit', color: 'var(--navy-mid)', flex: 1, boxSizing: 'border-box',
                      outline: 'none', background: 'white',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#059794';
                      e.target.style.boxShadow = '0 0 0 2px rgba(5, 151, 148, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '0 16px', fontSize: '0.85rem', fontWeight: '600', height: '35px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleCancelAdd}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ padding: '0 16px', fontSize: '0.85rem', fontWeight: '600', height: '35px', background: '#059794', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {submitting ? 'Creating...' : 'Save Question ✓'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {loading && faqs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>Loading knowledge base FAQs…</div>
          ) : filteredFaqs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No FAQs match your search filters.</div>
          ) : (
            [...filteredFaqs]
              .sort((a, b) => getFAQTimestamp(b) - getFAQTimestamp(a))
              .map((faq) => {
                const qText = faq.data?.question || faq.text?.split('\n\n')[0] || 'Untitled Question';
              const aText = faq.data?.answer || faq.text?.split('\n\n')[1] || faq.text || '';
              const category = faq.data?.category || 'General';
              const tags = faq.data?.tags ? faq.data.tags.split(',').map(t => t.trim()) : [];
              const updated = formatFAQDate(faq.data?.lastUpdated);
              const idVal = faq.data?.id || '—';

              const isEditing = editingId === faq._id;

              if (isEditing) {
                return (
                  <form 
                    key={faq._id}
                    onSubmit={(e) => handleEditSubmit(e, faq._id)}
                    style={{
                      background: '#fcfdfd',
                      border: '2px solid #059794',
                      borderRadius: '8px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 4px 10px rgba(0,172,193,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059794', background: 'rgba(0,172,193,0.08)', padding: '5px 12px', borderRadius: '4px', border: '1px solid rgba(5, 151, 148, 0.2)' }}>
                        ID #{idVal}
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 600 }}>Category:</span>
                        <input
                          type="text"
                          required
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          style={{
                            height: '34px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                            fontSize: '0.9rem', fontFamily: 'inherit', color: 'var(--navy)', width: '160px', boxSizing: 'border-box',
                            outline: 'none', background: 'white',
                            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#059794';
                            e.target.style.boxShadow = '0 0 0 3px rgba(5, 151, 148, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--grey)', marginBottom: '4px', textTransform: 'uppercase' }}>Question</label>
                      <input
                        type="text"
                        required
                        value={editQuestion}
                        onChange={e => setEditQuestion(e.target.value)}
                        style={{
                          width: '100%', height: '34px', padding: '0 10px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit', color: 'var(--navy)', boxSizing: 'border-box',
                          outline: 'none', background: 'white',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#059794';
                          e.target.style.boxShadow = '0 0 0 3px rgba(5, 151, 148, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--grey)', marginBottom: '4px', textTransform: 'uppercase' }}>Answer</label>
                      <textarea
                        required
                        rows={3}
                        value={editAnswer}
                        onChange={e => setEditAnswer(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '0.85rem', lineHeight: '1.4', fontFamily: 'inherit', color: 'var(--navy-mid)',
                          boxSizing: 'border-box', resize: 'vertical',
                          outline: 'none', background: 'white',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#059794';
                          e.target.style.boxShadow = '0 0 0 3px rgba(5, 151, 148, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 200px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--navy)', fontWeight: 600 }}>Tags:</span>
                        <input
                          type="text"
                          value={editTags}
                          onChange={e => setEditTags(e.target.value)}
                          style={{
                            height: '28px', padding: '0 8px', border: '1.5px solid #cbd5e1', borderRadius: '6px',
                            fontSize: '0.8rem', fontFamily: 'inherit', color: 'var(--navy-mid)', flex: 1, boxSizing: 'border-box',
                            outline: 'none', background: 'white',
                            transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#059794';
                            e.target.style.boxShadow = '0 0 0 2px rgba(5, 151, 148, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0 16px', fontSize: '0.85rem', fontWeight: '600', height: '35px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={submitting}
                          style={{ padding: '0 16px', fontSize: '0.85rem', fontWeight: '600', height: '35px', background: '#059794', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {submitting ? 'Saving...' : 'Save Changes ✓'}
                        </button>
                      </div>
                    </div>
                  </form>
                );
              }

              // Normal Card View
              return (
                <div 
                  key={faq._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '0 8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        ID #{idVal}
                      </span>
                      <span style={{ 
                        fontSize: '0.92rem', 
                        fontWeight: 600, 
                        color: '#64748b',
                        letterSpacing: '0.3px'
                      }}>
                        Category: <strong style={{ color: '#059794', textTransform: 'uppercase', fontWeight: 800 }}>{category}</strong>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#334155', background: '#f1f5f9', padding: '3px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#475569' }}>
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>Updated: {updated}</span>
                    </div>
                  </div>

                  {/* Question Section */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>Q</span>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, lineHeight: 1.4, flex: 1 }}>
                      {qText}
                    </h4>
                  </div>
                  
                  {/* Answer Section (Cyan Theme) */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#e0f7fa', padding: '14px 16px', borderRadius: '8px', borderLeft: '3.5px solid #059794' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059794', background: '#b2ebf2', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>A</span>
                    <p style={{ fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', flex: 1 }}>
                      {aText}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Tags (Solid background, white text) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {tags.length > 0 && tags[0] !== '' ? (
                        tags.map((t, idx) => (
                           <span key={idx} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', background: '#059794', padding: '4px 12px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                             #{t}
                           </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No tags</span>
                      )}
                    </div>

                    {/* Action Buttons (Bigger and prominent) */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0 16px', fontSize: '0.85rem', fontWeight: '600', color: 'white', border: 'none', background: '#059794', minWidth: 'unset', height: '35px', display: 'flex', alignItems: 'center', gap: '6px' }} 
                        onClick={() => handleStartEdit(faq)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0 16px', fontSize: '0.85rem', fontWeight: '600', height: '35px', background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }} 
                        onClick={() => handleDelete(faq._id, qText)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Toast Notification pop up (bottom-right, non-blocking) */}
      {toast.show && (
        <>
          <style>{`
            @keyframes toastSlideIn {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'error' ? 'var(--red)' : '#059794',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'toastSlideIn 0.25s ease-out',
            pointerEvents: 'none'
          }}>
            {toast.type === 'error' ? '⚠' : '✓'} {toast.message}
          </div>
        </>
      )}
    </>
  );
}
