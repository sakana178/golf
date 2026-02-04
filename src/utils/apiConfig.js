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
    // 1. 优先使用专门的 WS 环境变量
    const envWsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_BASE_URL;
    if (envWsUrl) {
        return envWsUrl.endsWith('/') ? envWsUrl.slice(0, -1) : envWsUrl;
    }

    // 2. 尝试从 VITE_API_BASE_URL 自动转换 (http -> ws, https -> wss)
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (apiBase && apiBase.startsWith('http')) {
        return apiBase.replace(/^http/, 'ws');
    }

    const { protocol, hostname, host } = window.location;
    const isVercel = hostname.includes('vercel.app');
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

    // 3. Vercel 环境处理
    if (isVercel) {
        // Vercel 生产环境地址转发不支持 WebSocket
        // 如果没有配置环境变量，默认尝试连接固定 IP (注意：HTTPS 下连接 IP 的 wss 可能会因证书问题失败)
        const BACKEND_SERVER_IP = '8.148.244.222:8080'; 
        return `${wsProtocol}//${BACKEND_SERVER_IP}`;
    }

    // 4. 开发环境或普通服务器部署
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
