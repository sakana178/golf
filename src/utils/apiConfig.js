/**
 * API 配置工具
 * 支持通过环境变量配置后端 API 地址
 */

// 获取 API 基础 URL
export const getApiBaseUrl = () => {
    // 如果设置了环境变量，使用环境变量
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }

    // 开发环境默认使用代理
    if (import.meta.env.DEV) {
        return ''; // 空字符串表示使用相对路径，会走 Vite proxy
    }

    // 生产环境默认使用相对路径（通过 Vercel rewrites 转发）
    return '';
};

// 获取 WebSocket 基础 URL
export const getWsBaseUrl = () => {
    // 1. 优先使用环境变量，这是最灵活的配置方式
    const envWsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_BASE_URL;
    if (envWsUrl) {
        return envWsUrl.endsWith('/') ? envWsUrl.slice(0, -1) : envWsUrl;
    }

    const { protocol, hostname, host } = window.location;
    const isVercel = hostname.includes('vercel.app');
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

    // 2. 如果在 Vercel 环境下
    // Vercel Rewrites 不支持 WebSocket，因此必须直连后端服务器
    if (isVercel) {
        // 这里填入你目前后端的固定服务器地址
        // 注意：如果 Vercel 是 https，后端也必须支持 wss (通常需要域名+SSL)
        const BACKEND_SERVER_IP = '8.148.244.222:8080'; 
        return `${wsProtocol}//${BACKEND_SERVER_IP}`;
    }

    // 3. 开发环境
    if (import.meta.env.DEV) {
        // 如果环境变量里配置了 API 地址且不是 localhost，尝试转换协议直连
        const apiBase = import.meta.env.VITE_API_BASE_URL;
        if (apiBase && !apiBase.includes('localhost') && apiBase.startsWith('http')) {
            return apiBase.replace(/^http/, 'ws');
        }
        // 默认走本地开发代理
        return `${wsProtocol}//${host}`;
    }

    // 4. 普通服务器部署（如 Nginx）
    // 在普通服务器上，通常会配置 Nginx 代理 /ws 路径，所以可以使用相对当前域名的地址
    return `${wsProtocol}//${host}`;
};

// 构建完整的 API URL
export const buildApiUrl = (path) => {
    const baseUrl = getApiBaseUrl();
    // 移除路径开头的斜杠（如果有）
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    if (baseUrl) {
        // 确保 baseUrl 不以斜杠结尾
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}/${cleanPath}`;
    }

    // 如果没有 baseUrl，使用相对路径（走 Vercel rewrites）
    return `/${cleanPath}`;
};

// 构建完整的 WebSocket URL
export const buildWsUrl = (path) => {
    const baseUrl = getWsBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (baseUrl && !import.meta.env.DEV) {
        // 生产环境使用配置的 baseUrl
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}${cleanPath}`;
    }

    // 开发环境或没有配置时，使用相对路径
    return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${cleanPath}`;
};

// 导出默认配置
export default {
    getApiBaseUrl,
    getWsBaseUrl,
    buildApiUrl,
    buildWsUrl,
};
