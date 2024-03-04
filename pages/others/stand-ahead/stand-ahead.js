import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";
import TWEEN from "../../../utils/tween.umd";

function throttle(fn, delay = 500) {
  let timer = null;
  return function() {
    if (timer) return;
    timer = setTimeout(() => {
      fn.apply(this, arguments);
      timer = null;
    }, delay);
  };
}

Page({
  data: {
    version: "v2", // 可自行切换 v1 v2 来体验不同模式下的效果
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile("https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb");
  },

  async ready({ detail: slam }) {
    try {
      const modelArrayBuffer = await this.downloadAsset;
      const model3d = await slam.createGltfModel(modelArrayBuffer);

      // 先隐藏模型，再加入场景
      model3d.visible = false;
      slam.add(model3d, 0.5);
      this.model3d = model3d;
      this.slam = slam;
      // slam组件是否是v2
      this.isV2 = slam.isSlamV2();

      const standCheck = throttle(this.standAheadCamera, 600);

      this.model3d.onBeforeRender = () => {
        standCheck();
        TWEEN.update();
      };

      // 开启slam平面追踪
      await slam.start();

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
    }
  },

  standAheadCamera() {
    if (!this.slam) return;

    const camera = this.slam.defaultCamera;
    // 获取相机正视的世界空间方向的向量
    const cameraDirVec3 = camera.getWorldDirection();
    const pos = camera.position.clone();
    const distance = this._distance;

    // 相机当前位置的向量(pos)加上相机方向向量(cameraDirVec3)与固定距离(distance)的乘积，
    // 就可得出一个在相机正前方固定距离的一个点位。
    pos.addScaledVector(cameraDirVec3, distance);

    // 再把这个位置的y值拉到与模型当前y值一致
    pos.y = this.model3d.position.y;

    this.targetPos = pos;

    // 通过tween来做过渡
    new TWEEN.Tween(this.model3d.position)
      .to(this.targetPos, 300)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({ x, y, z }) => {
        this.model3d.position.set(x, y, z);
        console.warn("onUpdate", x, y, z);
      })
      .start();


    // 或直接赋值给模型位置
    // this.model3d.position.copy(pos);
  },

  // slam组件被点击
  slamTap() {
    const { slam, model3d } = this;

    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    // 传入屏幕中心坐标点进行放置
    const flag = slam.standOnThePlane(model3d, Math.round(windowWidth / 2), Math.round(windowHeight / 2), true);

    if (flag) {
      model3d.visible = true;

      this._distance = slam.defaultCamera.position.distanceTo(model3d.position);
    } else {
      wx.showToast({
        title: "请对准平面放置",
        icon: "none"
      });
    }
  },

  error({ detail }) {
    wx.hideLoading();
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },

  onUnload() {
    this.slam = null;
    this.model3d = null;
  },
});
