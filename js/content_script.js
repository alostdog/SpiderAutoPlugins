$(function() {

// 将targetUrls声明为全局变量
var targetUrls = [];
// 存储所有请求数据
var allRequests = [];

console.log('Content Script 已加载，开始监听网络请求...');

// 添加请求数据到列表
function addRequestData(requestData) {
  console.log('添加请求数据:', requestData);
  
  allRequests.push({
    ...requestData,
    timestamp: Date.now()
  });
  
  console.log('当前请求总数:', allRequests.length);
  
  // 限制存储的请求数量，避免内存占用过大
  if (allRequests.length > 1000) {
    allRequests = allRequests.slice(-500);
    console.log('请求数量超过1000，已清理到500个');
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getRequestsData') {
    // 返回所有收集到的请求数据
    sendResponse({
      success: true,
      data: allRequests
    });
  }
  return true; // 保持消息通道开放
});

// 检查当前页面是否是127.0.0.1:8081（用于高级功能的登录检查）
function checkCurrentDomain() {
	const currentUrl = window.location.href;
	if (currentUrl.includes('127.0.0.1:8081')) {
		// 如果是127.0.0.1:8081域名，检查登录状态
		chrome.runtime.sendMessage({action: 'checkLoginStatus'}, (response) => {
			if (response && response.success) {
				if (!response.isLoggedIn && !currentUrl.includes('/user/login')) {
					console.log('检测到未登录状态，自动打开登录页面');
					chrome.runtime.sendMessage({action: 'openLoginPage'});
				}
			}
		});
	}
}

// 页面加载完成后检查登录状态（用于高级功能）
checkCurrentDomain();

// 向background script请求获取targetUrls
chrome.runtime.sendMessage({action: 'getTargetUrls'}, (response) => {
  if (response && response.success) {
    window.targetUrls = response.data; 
    targetUrls = response.data; 
  } else {
    console.error('获取targetUrls失败:', response.error);
  }
});
  
  /*监听消息*/
  window.addEventListener("message", function(e) {
    try {
      // 忽略keepAlive消息
      if (e.data && e.data.type === 'keepAlive') {
        return;
      }

      // 处理来自spiderWei.js的请求数据
      if (e.data && (e.data.type === 'XHR_DATA' || e.data.type === 'FETCH_DATA')) {
        console.log('收到网络请求数据:', e.data);
        
        let url = e.data.url;
        let response = e.data.response;
        let method = e.data.method;
        let request = e.data.request;

        // 同时支持基础功能和高级功能
        if (url && (response || request)) {
          const json_data = {
            "url": url,
            "method": method,
            "request": request,
            "response": response
          };
          
          // 基础功能：检查是否匹配目标URL，如果匹配则发送到background进行数据提交
          targetUrls = window.targetUrls;
          if (targetUrls && targetUrls.some(targetUrl => url.includes(targetUrl))) {
            console.log('基础功能 - 发送匹配数据到background:', json_data);
            chrome.runtime.sendMessage(json_data).catch(() => {});
          }
          
          // 高级功能：收集所有请求数据用于监控和导出
          console.log('高级功能 - 收集请求数据:', json_data);
          addRequestData(json_data);
        } else {
          console.log('跳过无效请求数据:', e.data);
        }
      }
    } catch (error) {
      console.error('处理请求数据时出错:', error);
    }
  });
  
  console.log('消息监听器已设置完成 - 基础功能和高级功能均已启用');
});