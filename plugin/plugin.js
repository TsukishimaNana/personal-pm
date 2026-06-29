/**
 * Task Signal Plugin — Super Productivity 插件
 *
 * 监听任务变化 hooks，将当前任务列表写入 tasks-signal.json。
 * 供外部 Python monitor.py 通过 watchdog 检测变化后读取。
 *
 * hooks 来源：packages/plugin-api/src/types.ts PluginHooks 枚举
 */

// ── 状态 ──
let currentTaskId = null;
let writeTimeout = null;
const SIGNAL_PATH = 'C:\\Users\\Public\\activity-log\\tasks-signal.json';
const DEBOUNCE_MS = 150;

// ── 工具函数 ──

/** 构建 signal 数据对象 */
function buildSignal(event, tasks) {
  return {
    updatedAt: new Date().toISOString(),
    event: event,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      isDone: t.isDone,
      tagIds: t.tagIds,
      timeEstimate: t.timeEstimate,
      projectId: t.projectId,
    })),
    currentTaskId: currentTaskId,
  };
}

/** 写入 signal 文件（尝试 fs，失败则 console.log）*/
function writeSignal(data) {
  const json = JSON.stringify(data, null, 2);
  // 主路径：Node.js fs（插件在 Electron renderer 中有 require 权限）
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(SIGNAL_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SIGNAL_PATH, json, 'utf-8');
    console.log(`[task-signal] 已写入 ${SIGNAL_PATH}: ${data.event}`);
  } catch (e) {
    // 备选路径：console 输出供调试
    console.log(`[task-signal] 文件写入失败 (${e.message}), 数据:`);
    console.log(json);
  }
}

/** 防抖写入 */
function debouncedWrite(event) {
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = setTimeout(async () => {
    try {
      const tasks = await PluginAPI.getTasks();
      const data = buildSignal(event, tasks);
      writeSignal(data);
    } catch (err) {
      console.error('[task-signal] getTasks 失败:', err);
    }
  }, DEBOUNCE_MS);
}

// ── Hook 注册 ──
// 使用 PluginAPI.Hooks 枚举值，对应 PluginHooks 中的 camelCase 值

PluginAPI.registerHook(PluginAPI.Hooks.TASK_CREATED, (payload) => {
  console.log(`[task-signal] TASK_CREATED: ${payload.taskId}`);
  debouncedWrite('TASK_CREATED');
});

PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, (payload) => {
  console.log(`[task-signal] TASK_COMPLETE: ${payload.taskId}`);
  debouncedWrite('TASK_COMPLETE');
});

PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, (payload) => {
  console.log(`[task-signal] TASK_UPDATE: ${payload.taskId}`);
  debouncedWrite('TASK_UPDATE');
});

PluginAPI.registerHook(PluginAPI.Hooks.TASK_DELETE, (payload) => {
  console.log(`[task-signal] TASK_DELETE: ${payload.taskId}`);
  debouncedWrite('TASK_DELETE');
});

PluginAPI.registerHook(PluginAPI.Hooks.CURRENT_TASK_CHANGE, (payload) => {
  // payload: { current: Task | null, previous: Task | null }
  const newId = payload.current ? payload.current.id : null;
  const prevId = payload.previous ? payload.previous.id : null;
  console.log(`[task-signal] CURRENT_TASK_CHANGE: ${prevId} → ${newId}`);
  currentTaskId = newId;
  debouncedWrite('CURRENT_TASK_CHANGE');
});

// ── 初始化 ──
console.log('[task-signal] 插件已加载');
// 启动时写入一次初始状态
setTimeout(() => debouncedWrite('INIT'), 500);

// 注册一个 header button 方便手动触发（调试用）
PluginAPI.registerHeaderButton({
  label: '📡 Signal',
  icon: 'publish',
  onClick: () => {
    debouncedWrite('MANUAL');
    PluginAPI.showSnack({ msg: '信号已刷新', type: 'INFO' });
  },
});
