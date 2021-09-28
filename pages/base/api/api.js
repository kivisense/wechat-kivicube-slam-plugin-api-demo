import { errorHandler, showAuthModal } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  /**
   * 高级API对象是通过ready事件传递出来的。
   * 如果设置了错误的license，则只会触发error事件。
   * 只有设置了和当前小程序appid相匹配且正确的license，才能通过ready事件拿到高级API对象slam。
   */
  async ready({ detail: slam }) {
    try {
      this.slam = slam;

      // slam模式下，在start调用时，才会去打开摄像头。start调用成功后，才会显示摄像头画面。
      // 陀螺仪模式下，ready事件触发时，代表摄像头已经打开，并可看见摄像头画面。
      await slam.start();

      // 开启追踪成功后，才能去调用slam.standOnThePlane，将内容放置在真实世界的某个平面上。
      // 在start调用之前，可去下载、加载准备好所有的素材和内容。然后再调用start。
    } catch (e) {
      errorHandler(e);
    }
  },

  error({ detail }) {
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },
});
