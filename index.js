/**
 * dsh-session-status-filter — host 侧入口。
 *
 * 本插件的功能全部在 client 侧完成（读 slots root 注入的 sessions/uiSession），
 * host 侧只需声明 bundle patch。这里导出空 apply 以满足 package 入口要求。
 */
export function apply() {}
