require('es6-promise').polyfill()
import Axios from 'axios'
import Cookies from 'js-cookie';

const http = Axios.create()
http.defaults.timeout = 20000

// 添加请求拦截器
http.interceptors.request.use(function (config) {
  // 在发送请求之前做些什么
  return config;
}, function (error) {
  // 对请求错误做些什么
  return Promise.reject(error);
});

// 添加响应拦截器
http.interceptors.response.use(function (response) {
  // token验证失败跳转登录页
  return response
}, function (error) {
  // 对响应错误做点什么
  return Promise.reject(error);
});

const postRequest = (data) => {
  const token = Cookies.get('appToken');
  if(token){
    return http({
      method: 'post',
      url: data.url,
      params: data.data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'customerToken':token
      }
    })
  }else{
    return http({
      method: 'post',
      url: data.url,
      params: data.data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    })
  }
}

const postImRequest = (data) => {
  const accessToken = Cookies.get('imToken');
  if(accessToken){
    return http({
      method: 'post',
      url: data.url,
      params: data.data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'access-token':accessToken
      }
    })
  }else{
    return http({
      method: 'post',
      url: data.url,
      params: data.data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    })
  }

}

const postResRequest = (data) => {
  const token = Cookies.get('appToken');
  if(token){
    return http({
      method: 'post',
      url: data.url,
      data: data.data,
      headers: {
        'Content-Type': 'multipart/form-data',
        'customerToken':token
      }
    })
  }else{
    return http({
      method: 'post',
      url: data.url,
      data: data.data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

}

export default {
  login:data => postRequest({url:'/api/customer/login/loginByPassword',data}),//登陆
  getGlassesList:data => postRequest({url:'/api/customer/remote/getGlassesList',data}),//获取智能眼镜列表
  sendMessage:data=> postImRequest({url:'/api/message/send',data}),//发送呼叫信息
  getStaffNameHead:data=> postRequest({url:'/api/customer/remote/getStaffNameHead',data}),//获取个人信息
  underwayVideoRoomList:data=> postRequest({url:'/api/customer/remote/underwayVideoRoomList',data}),//获取房间列表
}

