<template>
    <div class="hello">
        <div class="login">
            <el-form ref="form" :model="form" label-width="80px">
                <el-form-item label="手机号码">
                    <el-input v-model="form.phone"></el-input>
                </el-form-item>
                <el-form-item label="密码">
                    <el-input type="password" v-model="form.password"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button class="submitButton" type="primary" @click="onSubmit">登录</el-button>
                </el-form-item>
            </el-form>
        </div>

        <el-dialog
                title="提示"
                :visible.sync="dialogVisible"
                width="30%">
            <span>接通信息</span>
            <span slot="footer" class="dialog-footer">
                <el-button type="primary" @click="sendAccpet">确 定</el-button>
            </span>
        </el-dialog>

        <h3>在线列表区域</h3>
        <div class="showLisData">
            <div class="buttonBox" v-for="(item,index) in glassesList" :key="index">
                <p v-if="item.lineStatus === '1'">{{item.phoneNum}}</p>
                <el-button type="primary" plain v-if="item.lineStatus === '1'" class="btn_online"
                           @click="toShowCallModal(item.phoneNum)">呼叫
                </el-button>
                <el-button type="info" plain v-if="item.lineStatus === '0'" class="btn_outline">离线</el-button>
            </div>
        </div>
        <div class="ctr">
            <p>视频区域</p>
            <p class="message">{{messageTitle}}</p>
            <p>
                <el-button type="danger" @click="exitRoom()">退出</el-button>
            </p>
        </div>
        <div class="videoRoom">
            <!-- 视频区域 -->
            <div id="videoList" ref="video"></div>
        </div>
    </div>
</template>

<script>
    import {mapGetters} from "vuex";
    import Cookies from 'js-cookie'
    import api from '../api/index.js'
    import CIMWebBridge from '../util/cimWebSdk.js'
    import $ from 'jquery';

    let room_members = new Map();
    let shinevv = null;

    export default {
        name: 'HelloWorld',
        data() {
            return {
                msg: 'hello',
                form: {
                    phone: '13118500038',
                    password: '123456'
                },
                glassesList: [],
                user: {},
                localMemberId: "",
                timerFlag: '',
                calledNum: '',//保留被呼叫者电话号码
                messageTitle: '',
                dialogVisible: false,
            }
        },
        computed: {
            ...mapGetters(["getConnectStatus", "getContent", "getCallStatus"]),
        },
        //销毁前清除定时器
        beforeDestroy() {
            clearInterval(this.timerFlag)
        },
        methods: {
            //登录部分
            onSubmit() {
                let phoneNum = this.form.phone
                let securityCode = this.form.password
                api.login({phone: phoneNum, password: securityCode}).then(response => { // 线上的
                    const res = response.data
                    if (res.code === 1 && res.data && res.data.token) {
                        console.log('业务系统登录成功')
                        Cookies.set('appToken', res.data.token, {expires: 10})
                        Cookies.set('imToken', res.data.imtoken, {expires: 10})
                        window.localStorage.setItem('account', phoneNum)
                        console.log(window.localStorage.getItem('account'))
                        this.getGlassesList()// 获取眼镜
                        this.getStaffNameHead()
                        CIMWebBridge.connection()// 建立链接的

                        //5s重新连接
                        this.timerFlag = setInterval(() => {
                            if (!CIMWebBridge.sendflags()) {//拿到绑定值，在链接失败的时候去建立链接
                                CIMWebBridge.connection();//建立链接的
                            }
                        }, 5000);
                    }
                })
            },
            // 获取智能眼镜列表
            getGlassesList() {
                const currPage = 1
                api.getGlassesList({pageNum: currPage}).then(response => {
                    const res = response.data
                    if (res.code === 1) {
                        console.log('获取列表')
                        console.log(res.data.list[0])
                        this.glassesList = res.data.list
                    }
                })
            },
            // 获取个人信息
            getStaffNameHead() {
                api.getStaffNameHead().then(response => {
                    const res = response.data
                    if (res.code === 1) {
                        console.log('用户信息')
                        console.log(res.data)
                        this.user = res.data
                    }
                })
            },
            //呼叫
            toShowCallModal(phoneNum) {
                this.calledNum = phoneNum;
                this.$store.commit('updateCallStatus', true);//web主动呼叫 更新状态
                let content = '';
                content = "Call#Start" + "#" + this.form.phone + "#"+ this.user.name + "#" + 'false';
                this.sendMessageApi(phoneNum, content)
            },
            //呼叫数据整理并请求
            sendMessageApi(phoneNum, contents) {
                const data = {
                    receiver: phoneNum,
                    sender: this.form.phone,
                    title: 'monitor',
                    content: contents,
                    action: '0',
                    format: '0'
                }
                api.sendMessage(data).then(res => {
                    console.log(res.data)
                    if (res.data.code === 200) {
                        console.log('呼叫成功')
                        this.messageTitle = '-----呼叫成功，请等待几秒-----'
                    }
                })
            },

            //发送accept
            sendAccpet() {
                this.dialogVisible = false;
                this.sendMessageApi(this.calledNum, 'Call#Accept#13118500038#胡专家#https://call.effiar.com/resourcesstring');
            },

            //获取房间列表
            underwayVideoRoomList(roomStatus) {
                const data = {
                    pageNum: 1,
                    roomStatus: roomStatus
                }
                api.underwayVideoRoomList(data).then(res => {
                    console.log(res.data)
                    if (res.data.code === 200) {
                        // console.log('666666666666666666666')
                        // this.messageTitle = '-----呼叫成功，请等待几秒-----'
                    }
                })
            },
            //加入房间
            joinToRoom(roomId, roomToken) {
                console.log('进入joinToRoom');
                this.localMemberId = parseInt(Math.random() * 9999999 + 1).toString();
                shinevv = null;
                shinevv = new Shinevv(this.localMemberId,'Center',{},'39.97.172.191',34433)
                this.showRoomVideo(roomId, roomToken)
            },
            //具体的显示视频
            showRoomVideo(roomId, roomToken) {
                console.log('进入showRoomVideo');
                let _this = this;
                let t;
                clearTimeout(t)
                t = setTimeout(function () {
                    shinevv.joinRoom(
                        roomId,
                        "audio",
                        roomToken,

                        // 加入房间成功回调.
                        function () {
                            console.log("加入房间成功回调.");
                            room_members.set(this.localMemberId, "本地专家");
                        },

                        // 获取成员列表回调.c
                        function (members) {
                            console.log("获取成员列表回调.");
                            // console.log("joinRoom onGetMemberList members=%o", members);
                            const {memberList} = members;
                            let isHaveGlass = false;
                            memberList.forEach(function (val) {
                                if (val.displayName === "Glass") {
                                    _this.putVideoList(val.memberId);
                                    room_members.set(val.memberId, val.displayName);
                                    isHaveGlass = true;
                                }
                            });
                            if (!isHaveGlass) {
                                api.closeRoom({roomNum: roomId}).then(res => {
                                    console.log("关闭房间", res.data);
                                    _this.$message('无效的房间');
                                    _this.exitRoom();
                                });
                            }
                        },

                        // 加入房间失败回调.
                        function (reason) {
                            console.log("加入房间失败回调.");
                            shinevv.leaveRoom();
                            shinevv = null;

                            room_members.delete(this.localMemberId);
                            _this.delVideoList(this.localMemberId);
                        },

                        // 打开音视频失败回调.
                        function () {
                            console.log("打开音视频失败回调.");
                        },

                        // Socket失去连接回调.
                        function () {
                            console.log("Socket失去连接回调.");
                            shinevv.leaveRoom();
                            shinevv = null;
                            room_members.clear();
                            _this.delVideoList(this.localMemberId);
                        },

                        // 房间关闭回调.
                        function (reason) {
                            console.log("房间关闭回调.");
                            shinevv.leaveRoom();
                            shinevv = null;
                            room_members.clear();
                            _this.delVideoList(this.localMemberId);
                        },

                        // 加入房间后的新成员加入房间回调.
                        function (remote_memberId, displayName) {
                            console.log("加入房间后的新成员加入房间回调.");
                            room_members.set(remote_memberId, displayName);
                        },

                        // 成员离开房间回调.
                        function (remote_memberId,displayName) {
                            console.log("成员离开房间回调.");
                            _this.delVideoList(remote_memberId);
                            room_members.delete(remote_memberId);
                        },

                        // 成员媒体状态改变回调.
                        function (memberId, kind, bOpen, track) {
                            console.log("成员媒体状态改变回调.");
                        },

                        // 收到自定义消息回调.c
                        function (memberId, data) {
                            console.log("收到自定义消息回调.");
                        },

                        // 房间计时回调.
                        function (room_last_time) {
                            console.log("房间计时回调.");
                        },

                        // 成员音量改变回调.
                        function (peerName, newVolume) {
                            console.log("成员音量改变回调.");
                        },

                        function(peerName, method){
                            // 收到屏幕共享流回调

                        },

                        // 收到语音激励回调.
                        function (peerName) {
                            console.log("收到语音激励回调.");
                        },
                        function(memberId, deviceId, bOpen, track){
                            // 对端视频设备回调.
                            console.log('onRecvDeviceVideo memberId = %s deviceId = %s  bOpen = %s track = %o', memberId, deviceId, bOpen.toString(), track);

                        }
                    );
                }, 3000);
            },
            //加入具体的div中
            putVideoList(memberId) {
                console.log('进入putVideoList');
                let videoId = "video_" + String(memberId);
                console.log(videoId + "videoId")
                if (!document.getElementById(videoId) !== undefined) {
                    // 如果ID不存在则插入DOM
                    let videoItem = document.createElement("video");
                    videoItem.id = videoId;
                    videoItem.autoplay = "autoplay";
                    videoItem.preload = "auto";
                    let videoListContainer = document.getElementById("videoList");
                    videoListContainer.insertBefore(
                        videoItem,
                        videoListContainer.childNodes[0]
                    );
                    shinevv.setVideoLabel(memberId, videoId);
                }
            },
            exitRoom() {
                console.log('进入exitRoom');
                if (!shinevv)
                    return;
                shinevv.leaveRoom();
                shinevv = null;
                room_members.clear();
                this.delVideoList(this.localMemberId);
            },
            delVideoList(memberId) {
                console.log('进入delVideoList');
                let videoId = "video_" + String(memberId);
                $("#" + videoId + "").remove()
                this.closeRoom();
            },
            closeRoom() {//离开房间
                console.log('进入closeRoom');
                let content = "Call#ControlCenterFinish" + "#" + this.form.phone + "#集控中心" + "#" + 'finish';
                const data = {
                    receiver: this.calledNum,
                    sender: this.form.phone,
                    title: 'monitor',
                    content: content,
                    action: '0',
                    format: '0'
                }
                api.sendMessage(data).then(res => {
                    console.log(res.data)
                    if (res.data.code === 200) {
                        console.log('离开房间成功')
                        this.messageTitle = '已离开房间';
                    }
                })
            },
        },
        watch: {
            //链接状态下才做这件事
            getContent: function (newVal) {
                console.log("进入getContent");
                // debugger
                const content = newVal.content;
                const info = content.split("#");
                console.log("#################################");
                console.log(info)
                console.log("#################################");
                console.log(this.getCallStatus)
                //const _this = this;
                //当响应信息变化，同时
                if (this.getCallStatus) {
                    //处理web主动呼叫
                    if (info[1] === 'Room') {
                        const roomId = info[2];
                        const roomToken = info[3];
                        console.log('准备加入房间')
                        console.log(roomId, roomToken)
                        this.joinToRoom(roomId, roomToken);
                    }
                    this.$store.commit('updateCallStatus', false);
                } else {    //眼镜端主动呼叫
                    if(info[1] === 'Room'){
                        const roomId = info[2];
                        const roomToken = info[3];
                        console.log('准备加入房间')
                        console.log(roomId, roomToken)
                        this.joinToRoom(roomId, roomToken);
                    } else {
                        this.dialogVisible = true;
                        this.calledNum = info[2];
                    }
                }
            }
        }
    }
</script>

<style lang="less" scoped>
    .hello {
        width: 1200px;
        margin: 20px auto 0;

        .login {
            width: 600px;
            padding: 50px 0;
            border: 1px solid #ddd;

            .submitButton {
                width: 150px;
            }
        }

        .showLisData {
            width: 1000px;
            height: 160px;
            margin-top: 15px;
            border: 1px solid #ddd;
            overflow: hidden;

            .buttonBox {
                width: 130px;
                height: 90px;
                border: 1px solid #dddddd;
                border-radius: 5px;
                float: left;
                margin: 0 15px 15px 0;
                position: relative;
                text-align: center;

                p {
                    text-align: center;
                    color: #409EFF;
                }

                .btn_online {
                    margin-top: 20px;
                }

                .btn_outline {
                    margin-top: 20px;
                }
            }
        }

        .ctr {
            width: 1000px;
            height: 50px;
            margin: 10px 0;

            p:first-child {
                float: left;
            }

            p:last-child {
                float: right;
            }
        }

        .videoRoom {
            width: 1000px;
            height: 600px;
            margin-top: 15px;
            border: 1px solid #ddd;
            overflow: hidden;

            #videoList {
                width: 1000px;
                height: 600px;
            }
        }

        #videoList > video {
            width: 100%;
            height: 100%;
        }


    }
</style>
