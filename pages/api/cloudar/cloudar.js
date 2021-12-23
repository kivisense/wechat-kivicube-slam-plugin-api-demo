import { errorHandler, showAuthModal } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    showGuide: false,
    guideTip: ""
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });
  },

  async ready({ detail: slam }) {
    await slam.start();
    wx.hideLoading();
    this.slam = slam;
    this.setData({
      showGuide: true,
      guideTip: "对准识别图，点击开始识别"
    })
  },

  error({ detail }) {
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },

  async handleStart() {
    this.setData({
      showGuide: true,
      guideTip: "请对准识别图"
    })

    const sceneId = await this.slam.startCloudAr("b46rfc")
    if(!sceneId){
      return
    }

    wx.showModal({
      title: "提示",
      content: `${sceneId}`,
      showCancel: false
    });
    
    this.setData({
      showGuide: false
    })
  },

  handleStop() {
    this.slam.stopCloudAr()
    
    this.setData({
      showGuide: false
    })
  }

});
