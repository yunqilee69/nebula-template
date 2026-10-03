// 纯逻辑导出。React 适配器（Access.tsx / usePermission.tsx）依赖 React 运行时，
// 由 App 壳直接按路径引用，不经此处 barrel，以免进入无 React 类型环境的编译图。
export * from './permission.ts';
export * from './login-service.ts';
