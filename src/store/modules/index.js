const state = {
    connectStatus: false,
    isWebCall:false,//是否为web端主动呼叫
    content:'',//后端返回的呼叫信息
    goupContent:''
}

const getters = {
    getConnectStatus: ({connectStatus}) => connectStatus,
    getCallStatus:({isWebCall}) => isWebCall,
    getContent:({content}) => content,
    getGoupContent:({goupContent}) => goupContent
}

const actions = {

}


const mutations = {
    updateConnectStatus(state, payload) {
        state.connectStatus = payload
    },
    updateCallStatus(state,payload){
        state.isWebCall = payload
    },
    updateContent(state,payload){
        state.content = payload
    },
    updateGoupContent(state,payload){
        state.goupContent = payload
    }
}

export default {
    state,
    getters,
    actions,
    mutations
}
