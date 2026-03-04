import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiPlay, FiPause, FiRefreshCw } from 'react-icons/fi';

const FLOAT_W = 200;
const FLOAT_H = 310;

function PomodoroTimer({ attachedTask, onClose, onComplete }) {
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [phase, setPhase] = useState('work');
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [pos, setPos] = useState({
    x: Math.max(0, window.innerWidth - FLOAT_W - 24),
    y: Math.max(0, window.innerHeight - FLOAT_H - 24),
  });
  const intervalRef = useRef(null);
  const dragStartRef = useRef(null);

  const phaseColor = phase === 'work' ? '#6366f1' : '#10b981';
  const phaseDuration = (phase === 'work' ? workMins : breakMins) * 60;
  const phaseLabel = phase === 'work' ? 'Focus' : 'Break';

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            const nextPhase = phase === 'work' ? 'break' : 'work';
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(
                phase === 'work' ? 'Pomodoro done! Take a break.' : 'Break over — back to work!',
                { body: attachedTask ? attachedTask.title : '' }
              );
            }
            if (phase === 'work' && onComplete) onComplete();
            setPhase(nextPhase);
            return (nextPhase === 'work' ? workMins : breakMins) * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, phase, workMins, breakMins]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragStartRef.current = { offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y };
    const onMouseMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - FLOAT_W, e.clientX - dragStartRef.current.offsetX)),
        y: Math.max(0, Math.min(window.innerHeight - FLOAT_H, e.clientY - dragStartRef.current.offsetY)),
      });
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [pos]);

  const reset = () => {
    setRunning(false);
    setSeconds((phase === 'work' ? workMins : breakMins) * 60);
  };

  const handleWorkMinsChange = (val) => {
    const m = Math.max(1, Math.min(99, parseInt(val) || 1));
    setWorkMins(m);
    if (phase === 'work') { setRunning(false); setSeconds(m * 60); }
  };

  const handleBreakMinsChange = (val) => {
    const m = Math.max(1, Math.min(99, parseInt(val) || 1));
    setBreakMins(m);
    if (phase === 'break') { setRunning(false); setSeconds(m * 60); }
  };

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const progress = 1 - seconds / phaseDuration;
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="pomodoro-float" style={{ left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }}>
      <div className="pomodoro-header pomodoro-drag-handle" onMouseDown={handleMouseDown}>
        <span className="pomodoro-phase-label" style={{ color: phaseColor }}>{phaseLabel}</span>
        {attachedTask && (
          <span className="pomodoro-task-name" title={attachedTask.title}>
            {attachedTask.title.length > 18 ? attachedTask.title.slice(0, 18) + '…' : attachedTask.title}
          </span>
        )}
        <button className="btn-icon" onClick={onClose} aria-label="Close" onMouseDown={e => e.stopPropagation()}>
          <FiX size={15} />
        </button>
      </div>

      <div className="pomodoro-ring-container">
        <svg width="124" height="124" viewBox="0 0 124 124">
          <circle cx="62" cy="62" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="62" cy="62" r="54"
            fill="none"
            stroke={phaseColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            transform="rotate(-90 62 62)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="pomodoro-time">{mins}:{secs}</div>
      </div>

      <div className="pomodoro-controls">
        <button
          className="pomodoro-btn"
          onClick={() => setRunning(r => !r)}
          style={{ background: phaseColor }}
          aria-label={running ? 'Pause' : 'Start'}
        >
          {running ? <FiPause size={18} /> : <FiPlay size={18} />}
        </button>
        <button className="pomodoro-btn pomodoro-btn--reset" onClick={reset} aria-label="Reset">
          <FiRefreshCw size={16} />
        </button>
      </div>

      {/* Custom durations */}
      <div className="pomodoro-settings">
        <label className="pomodoro-setting">
          <span>Focus</span>
          <input
            type="number"
            min="1"
            max="99"
            value={workMins}
            onChange={e => handleWorkMinsChange(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
          />
          <span>min</span>
        </label>
        <label className="pomodoro-setting">
          <span>Break</span>
          <input
            type="number"
            min="1"
            max="99"
            value={breakMins}
            onChange={e => handleBreakMinsChange(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
          />
          <span>min</span>
        </label>
      </div>
    </div>
  );
}

export default PomodoroTimer;
