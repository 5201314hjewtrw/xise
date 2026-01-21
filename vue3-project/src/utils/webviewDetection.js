/**
 * WebView 检测工具
 * 用于检测当前环境是否为各种移动端 WebView
 */

/**
 * 检测是否在 Android WebView 中运行
 * @returns {boolean}
 */
export const isAndroidWebView = () => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  
  // 检查是否为 Android 设备
  const isAndroid = /Android/.test(ua)
  if (!isAndroid) return false
  
  // Android WebView 检测规则:
  // 1. 包含 'wv' 标识（官方 WebView 标识）
  const hasWebViewMarker = /\swv\s/.test(ua) || /\swv$/.test(ua) || /;\swv\)/.test(ua)
  
  // 2. 旧版 WebView: 有 Version/x.x 但没有 Chrome
  const hasVersionWithoutChrome = /Version\/[\d.]+/.test(ua) && !/Chrome/.test(ua)
  
  // 3. 缺少完整的 Chrome Mobile Safari 标识（某些自定义 WebView）
  const hasSafariButNotChromeMobile = /Safari/.test(ua) && !/Chrome\/[\d.]+\sMobile\sSafari/.test(ua)
  
  return hasWebViewMarker || hasVersionWithoutChrome || hasSafariButNotChromeMobile
}

/**
 * 检测是否在 iOS WebView 中运行
 * @returns {boolean}
 */
export const isIOSWebView = () => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  
  if (!isIOS) return false
  
  // iOS Safari 有 'Safari' 在 UA 中，而 WebView 通常没有
  // WKWebView 不会有 Safari 标识
  const isSafari = /Safari/.test(ua)
  const isChrome = /CriOS/.test(ua)  // Chrome on iOS
  const isFirefox = /FxiOS/.test(ua)  // Firefox on iOS
  
  // 如果是 iOS 但不是 Safari/Chrome/Firefox，则可能是 WebView
  if (!isSafari && !isChrome && !isFirefox) return true
  
  // 检查 standalone 模式 (PWA 从主屏幕启动)
  if (window.navigator.standalone) return true
  
  // 某些 WebView 虽然有 Safari 但实际是嵌入式的
  // 检查是否缺少某些 Safari 特有的特性
  return false
}

/**
 * 检测是否在任何 WebView 中运行
 * @returns {boolean}
 */
export const isWebView = () => {
  return isAndroidWebView() || isIOSWebView()
}

/**
 * 检测是否为移动设备
 * @returns {boolean}
 */
export const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
}

/**
 * 检测是否为 iOS 设备
 * @returns {boolean}
 */
export const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

/**
 * 检测是否为 Android 设备
 * @returns {boolean}
 */
export const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}

/**
 * 检测浏览器是否支持全屏 API（针对容器元素）
 * @returns {boolean}
 */
export const supportsFullscreenAPI = () => {
  if (typeof document === 'undefined') return false
  const testEl = document.createElement('div')
  return !!(
    testEl.requestFullscreen ||
    testEl.webkitRequestFullscreen ||
    testEl.mozRequestFullScreen ||
    testEl.msRequestFullscreen
  )
}

/**
 * 检测视频元素是否支持原生全屏
 * @returns {boolean}
 */
export const supportsNativeVideoFullscreen = () => {
  if (typeof document === 'undefined') return false
  const video = document.createElement('video')
  return typeof video.webkitEnterFullscreen === 'function'
}
