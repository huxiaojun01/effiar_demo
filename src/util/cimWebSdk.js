import store from '../store'
//var CIM_URI="wss://26.32.73.161/wss";//大兴机场
var CIM_URI="wss://call.effiar.com/wss"; // 修改为服务器的真实IP
var CMD_HEARTBEAT_RESPONSE = new Uint8Array([67,82]);
var SDK_VERSION = "1.0.0";
var SDK_CHANNEL = "browser";
var APP_PACKAGE = "com.farsunset.cim";
var ACTION_999 = "999";//特殊的消息类型，代表被服务端强制下线
var DATA_HEADER_LENGTH = 3;

var C_H_RS = 0;
var S_H_RQ = 1;
var MESSAGE = 2;
var SENTBODY = 3;
var REPLYBODY = 4;

var socket;
var manualStop = false;
var connetFlags = false;
var CIMWebBridge = new Object();
CIMWebBridge.connection = function(){
  manualStop = false;
  //window.localStorage.account = '';
  socket = new WebSocket(CIM_URI);
  socket.binaryType = 'arraybuffer';
  socket.onopen = CIMWebBridge.innerOnConnectionSuccessed;
  socket.onmessage = CIMWebBridge.innerOnMessageReceived;
  socket.onclose = CIMWebBridge.innerOnConnectionClosed;
};

CIMWebBridge.bindAccount = function(account){
  let deviceId = window.localStorage.deviceIddeviceId;
  if(deviceId === '' || deviceId === undefined){
    deviceId = generateUUID();
    window.localStorage.deviceId = deviceId;
  }

  var browser = getBrowser();
  var body = new proto.com.farsunset.cim.sdk.web.model.SentBody();
  body.setKey("client_bind");
  body.getDataMap().set("account",account);
  body.getDataMap().set("channel",SDK_CHANNEL);
  body.getDataMap().set("version",SDK_VERSION);
  body.getDataMap().set("osVersion", browser.version);
  body.getDataMap().set("packageName", APP_PACKAGE);
  body.getDataMap().set("deviceId", deviceId);
  body.getDataMap().set("device", browser.name);
  CIMWebBridge.sendRequest(body);
};

CIMWebBridge.stop = function(){
  manualStop = true;
  socket.close();
};

CIMWebBridge.resume = function(){
  manualStop = false;
  CIMWebBridge.connection();
};


CIMWebBridge.innerOnConnectionSuccessed = function(){
  console.log('连接成功')
  let account = window.localStorage.getItem('account');
  if(account === '' || account === undefined){
    CIMWebBridge.bindAccount(account);
  }else{
    CIMWebBridge.bindAccount(account);
  }

};



CIMWebBridge.innerOnMessageReceived = function(e){
  var data = new Uint8Array(e.data);
  var type = data[0];
  /**
   * 收到服务端发来的心跳请求，立即回复响应，否则服务端会在10秒后断开连接
   */
  if(type == S_H_RQ){
    CIMWebBridge.sendHeartbeatResponse();
    return;
  }

  if(type == MESSAGE){
    var length = getContentLength(data[1],data[2]);
    var data = proto.com.farsunset.cim.sdk.web.model.Message.deserializeBinary(data.subarray(DATA_HEADER_LENGTH,DATA_HEADER_LENGTH+length));
    onInterceptMessageReceived(data.toObject(false));
    return;
  }

  if(type == REPLYBODY){
    var length = getContentLength(data[1],data[2]);
    var data = proto.com.farsunset.cim.sdk.web.model.ReplyBody.deserializeBinary(data.subarray(DATA_HEADER_LENGTH,DATA_HEADER_LENGTH+length));
    /**
     * 将proto对象转换成json对象，去除无用信息
     */
    var reply = {};
    reply.code = data.getCode();
    reply.key = data.getKey();
    reply.message = data.getMessage();
    reply.timestamp = data.getTimestamp();
    reply.data = {};

    /**
     * 注意，遍历map这里的参数 value在前key在后
     */
    data.getDataMap().forEach(function (v,k){
      reply.data[k] = v;
    });

    onReplyReceived(reply);
  }
};

CIMWebBridge.innerOnConnectionClosed = function(e){
  console.log('连接关闭',e)
  connetFlags = false;
  console.log('连接关闭-----',connetFlags);
  if(!manualStop){
    var time = Math.floor(Math.random()*(30-15+1)+15);
    setTimeout(function(){
      CIMWebBridge.connection();
    },time);
  }
};

CIMWebBridge.sendRequest = function(body){
  var data = body.serializeBinary();
  var header = buildHeader(SENTBODY,data.length);
  var protubuf =  new Uint8Array(data.length + header.length);
  protubuf.set(header,0);
  protubuf.set(data,header.length);
  socket.send(protubuf);
};

CIMWebBridge.sendHeartbeatResponse = function(){
  var data = CMD_HEARTBEAT_RESPONSE;
  var header = buildHeader(C_H_RS,data.length);
  var protubuf =  new Uint8Array(data.length + header.length);
  protubuf.set(header,0);
  protubuf.set(data,header.length);
  socket.send(protubuf);
};

//向外暴露一个标记参数值
CIMWebBridge.sendflags = function(){
	return connetFlags;
}
/** 当收到请求回复时候回调  **/
function onReplyReceived(json){
  if(json.key=='client_bind' && json.code==200 ){
    console.log('绑定成功')
	connetFlags =true;
	console.log('绑定成功---'+connetFlags)
  }
}

function getContentLength( lv, hv) {
  var l = (lv & 0xff);
  var h = (hv & 0xff);
  return (l | (h <<= 8));
}

function buildHeader(type,length){
  var header = new Uint8Array(DATA_HEADER_LENGTH);
  header[0] = type;
  header[1] = (length & 0xff);
  header[2] = ((length >> 8) & 0xff);
  return header;

}
function onInterceptMessageReceived(message){
  //被强制下线之后，不再继续连接服务端
  if(message.action == ACTION_999){
    manualStop = true;
  }
  //收到消息后，将消息发送给页面
  if(onMessageReceived instanceof Function){
    onMessageReceived(message);
  }
}
function onMessageReceived(message){
  if(message.action === '0'){
    store.commit('updateConnectStatus', true);//接收到响应信息后，更新状态
    store.commit('updateContent', message);//接收到响应信息后，更新响应信息
  }else {
    store.commit('updateGoupContent', message);//接收到响应信息后，更新响应信息
  }

}
function getBrowser() {
  var explorer = window.navigator.userAgent.toLowerCase() ;
  // ie
  if (explorer.indexOf("msie") >= 0) {
    var ver=explorer.match(/msie ([\d.]+)/)[1];
    return {name:"IE",version:ver};
  }
  // firefox
  else if (explorer.indexOf("firefox") >= 0) {
    var ver=explorer.match(/firefox\/([\d.]+)/)[1];
    return {name:"Firefox",version:ver};
  }
  // Chrome
  else if(explorer.indexOf("chrome") >= 0){
    var ver=explorer.match(/chrome\/([\d.]+)/)[1];
    return {name:"Chrome",version:ver};
  }
  // Opera
  else if(explorer.indexOf("opera") >= 0){
    var ver=explorer.match(/opera.([\d.]+)/)[1];
    return {name:"Opera",version:ver};
  }
  // Safari
  else if(explorer.indexOf("Safari") >= 0){
    var ver=explorer.match(/version\/([\d.]+)/)[1];
    return {name:"Safari",version:ver};
  }

  return {name:"Other",version:"1.0.0"};
}

function generateUUID() {
  var d = new Date().getTime();
  var uuid =  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return  (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid.replace(/-/g,'');
}

export default CIMWebBridge;
