import { FC, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { TaskItem } from '../../store/useAppStore';

interface TasksTabProps {
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string) => void;
  onRemoveTask: (id: string) => void;
}

/**
 * TasksTab
 * Task velocity board with completion meters and quick inline creation.
 */
export const TasksTab: FC<TasksTabProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onRemoveTask,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAdd = () => {
    const trimmed = newTaskTitle.trim();
    if (trimmed) {
      onAddTask(trimmed);
      setNewTaskTitle('');
    }
  };

  return (
    <section
      role="tabpanel"
      id="panel-tasks"
      aria-labelledby="tab-tasks"
      className="space-y-3"
    >
      {/* Progress Summary Card */}
      <div className="p-3 bg-slate-900/70 rounded-xl border border-white/10 space-y-2 shadow-inner">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-semibold">Sprint Velocity</span>
          <span className="font-tabular font-bold text-sky-400">
            {completedCount} of {totalCount} done ({progressPercent}%)
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Sprint Velocity Progress"
          className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden"
        >
          <div
            className="bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Add Task Input */}
      <div className="flex items-center gap-2 bg-slate-900/70 p-1.5 rounded-xl border border-white/10 shadow-inner">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New focus task..."
          aria-label="New focus task title"
          className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button
          onClick={handleAdd}
          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
        >
          Add
        </button>
      </div>

      {/* Task Items */}
      <div className="space-y-1.5" role="list">
        {tasks.map((task) => (
          <div
            key={task.id}
            role="listitem"
            className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-white/[0.06] hover:border-white/20 transition-all hover:bg-slate-900/80"
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={task.completed}
              aria-label={`Mark task "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
              onClick={() => onToggleTask(task.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onToggleTask(task.id);
                }
              }}
              className="flex items-center gap-2.5 flex-1 text-left bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 rounded"
            >
              <span
                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                  task.completed
                    ? 'bg-sky-500 border-sky-400 text-slate-950'
                    : 'border-slate-600 group-hover:border-sky-400'
                }`}
                aria-hidden="true"
              >
                {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span
                className={`text-xs transition-all ${
                  task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'
                }`}
              >
                {task.title}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-tabular font-medium">{task.durationMins}m</span>
              <button
                onClick={() => onRemoveTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity focus:opacity-100 focus-visible:ring-1 focus-visible:ring-red-400 focus-visible:outline-none"
                title="Delete task"
                aria-label={`Delete task ${task.title}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
