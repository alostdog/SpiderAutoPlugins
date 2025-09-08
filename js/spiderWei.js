// SpiderWei.js - 网络请求拦截脚本
// 统一支持基础功能和高级功能

let debugMode = true; // 开启调试日志

console.log('SpiderWei.js 已加载，开始拦截网络请求...');

(function(xhr) {
  var XHR = xhr.prototype;
  var open = XHR.open;
  var send = XHR.send;
  var setRequestHeader = XHR.setRequestHeader;
  
  XHR.open = function(method, url) {
    this._method = method;
    this._url = url;
    this._headers = {};  
    if (debugMode) {
        console.log('XHR拦截 - 打开连接:', method, url);
    }
    return open.apply(this, arguments);
  };

  XHR.setRequestHeader = function(header, value) {
    this._headers[header] = value;  
    return setRequestHeader.apply(this, arguments);
  };

  XHR.send = function(postData) {
    var self = this;
    var modifiedPostData = postData;
    
    if (debugMode) {
        console.log('XHR拦截 - 发送请求:', this._method, this._url, postData ? '有数据' : '无数据');
    }
    
    if (this._method.toUpperCase() === 'POST' && this._url.includes('修改请求实例代码')) {
      try {
        var data = JSON.parse(postData);
        data['request']["params"][0]["stats_types"] = [];
        modifiedPostData = JSON.stringify(data);
        this._modifiedPostData = modifiedPostData;  
      } catch (err) {
        console.error("Error modifying postData:", err);
      }
    }
    else{
      this._modifiedPostData = modifiedPostData; 
    }

    
    // 监听响应
    this.addEventListener('load', function() {
      if (this._url) {
        try {
          if (debugMode) {
              console.log('XHR拦截 - 响应完成:', this._url);
          }
          
          // 获取响应数据
          const response = this.responseType === 'blob' 
            ? "Blob response (not shown)" 
            : this.responseText;
          
          // 发送请求和响应数据
          const messageData = {
            type: 'XHR_DATA',  // 自定义类型标识
            url: this._url,
            method: this._method,
            request: this._modifiedPostData || postData,  // 优先发送修改后的数据
            response: response
          };
          
          if (debugMode) {
              console.log('XHR拦截 - 发送消息:', messageData);
          }
          window.postMessage(messageData, '*');
        } catch (err) {
          if (debugMode) {
              console.error("XHR拦截 - 处理响应时出错:", err);
          }
        }
      }
    });

    return send.apply(this, [modifiedPostData]);

  };

  
})(XMLHttpRequest);



(function () {    
  // 重写 fetch
  const fetch_tools = {
      originalFetch: window.fetch.bind(window),
      myFetch: function (...args) {
          let [url, options = {}] = args;
          let modifiedUrl = url;
          let modifiedOptions = { ...options };
          
          if (debugMode) {
              console.log('Fetch拦截 - 请求:', url, options.method || 'GET');
          }
          
          if (typeof url === 'string') {
            // 统一的视频流过滤策略
            const videoExtensions = ['.flv', '.m3u8', '.ts', '.mp4', '.webm', '.ogg'];
            const shouldSkip = videoExtensions.some(ext => url.includes(ext)) || 
                              (options.responseType === 'blob' || options.responseType === 'arraybuffer');
            
            if (shouldSkip) {
              if (debugMode) {
                  console.log('Fetch拦截 - 跳过视频流:', url);
              }
              return fetch_tools.originalFetch(url, options);
            }
            

            if (url.includes('条件判断修改请求')) {
              if (!modifiedOptions.method || modifiedOptions.method === 'GET') {
                try {
                  const baseUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).href;
                  const urlObj = new URL(baseUrl);
                  urlObj.searchParams.set('pageSize', '100'); 
                  modifiedUrl = urlObj.toString();
                } catch (err) {}
              }
            }
          }
          

          return fetch_tools.originalFetch(modifiedUrl, modifiedOptions).then(async (response) => {
              if (debugMode) {
                  console.log('Fetch拦截 - 响应完成:', url);
              }
              
              // 统一的视频流过滤策略
              const videoExtensions = ['.flv', '.m3u8', '.ts', '.mp4', '.webm', '.ogg'];
              const shouldSkip = typeof url === 'string' && videoExtensions.some(ext => url.includes(ext));
              
              if (!shouldSkip) {
                try {
                  // 发送 Fetch 请求的响应数据
                  const originalResponse = await response.clone().text();
                  const messageData = {
                    type: 'FETCH_DATA',
                    url: response.url,
                    method: modifiedOptions.method || 'GET',
                    request: modifiedOptions.body || "No request body",
                    response: originalResponse
                  };
                  
                  if (debugMode) {
                      console.log('Fetch拦截 - 发送消息:', messageData);
                  }
                  window.postMessage(messageData, '*');
                } catch (err) {
                  if (debugMode) {
                      console.error('Fetch拦截 - 处理响应时出错:', err);
                  }
                }
              }
              return response;
          }).catch((error) => {
              if (debugMode) {
                  console.error('Fetch拦截 - 请求失败:', url, error);
              }
              return Promise.reject(error);
          });
      },
  }
  
  // 确保在页面加载完成后重写fetch
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.fetch = fetch_tools.myFetch;
      if (debugMode) {
          console.log('Fetch拦截 - 已启用');
      }
    });
  } else {
    window.fetch = fetch_tools.myFetch;
    if (debugMode) {
        console.log('Fetch拦截 - 已启用');
    }
  }
})();

console.log('SpiderWei.js 网络拦截功能已全部启用');