import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

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

    this.downloadAsset = Promise.all([
        requestFile("https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"),
        requestFile("https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/reticle.glb"),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [modelArrayBuffer, reticleArrayBuffer] = await this.downloadAsset;
      const [model3d, reticle] = await Promise.all([
        slam.createGltfModel(modelArrayBuffer),
        slam.createGltfModel(reticleArrayBuffer),
      ]);

      // 先隐藏模型，再加入场景
      model3d.visible = false;
      slam.add(model3d, 0.5);
      this.model3d = model3d;
      this.slam = slam;
      // slam组件是否是v2
      this.isV2 = slam.isSlamV2();

      const invokeCheck = throttle(this.checkCameraAngle, 600);
      /**
       * 利用addPlaneIndicator的回调方法，来处理 v1 与 v2 模式下用户未对准平面的问题
       * 
       * [v1的处理介绍]: 
       * v1模式因为有一个巨大的平面，所以有着超高的放置成功率，但是一旦体验者将相机朝向天空，
       * 模型就会被放置在很远的地方，导致模型不可见或者特别小。这个时候我们利用 onPlaneShowing 这个持续放置成功的回调，
       * 来检测体验者相机的倾斜角度，以此来提醒用户让相机尽量倾斜向下体验。
       * 
       * [v2的处理介绍]:
       * v2模式的处理相对简单，只需要知道模型放置的成功与否来判断，当前体验者相机朝向的位置是否有可用的平面，
       * 这里利用 onPlaneShow 和 onPlaneHide 两个回调函数就能实现。
       * **/
      slam.addPlaneIndicator(reticle, {
        size: 0.4,
        // camera画面中心对准的位置有可用平面，指示器初次放置到该平面的时候调用
        onPlaneShow: () => {
          console.log("onPlaneShow");

          if (this.isV2) {
            clearTimeout(this.timer);
            wx.hideToast();
          }

        },
        // camera画面中心对准的位置无可用平面，指示器无法放置的时候调用
        onPlaneHide: () => {
          console.log("onPlaneHide");

          if (this.isV2) {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
              wx.showToast({
                title: "请对准平面，点击屏幕放置",
                icon: "none",
                duration: 20000,
              });
            }, 400);
          }
        },
        // camera画面中心对准的位置有可用平面，指示器持续放置到该平面都放置成功的时候调用 **持续**调用
        onPlaneShowing: () => {
          if (!this.isV2) {
            invokeCheck();
          }
        },
      });

      // 开启slam平面追踪
      await slam.start();

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
    }
  },

  checkCameraAngle() {
    const camera = this.slam.defaultCamera;
    const pos = camera.position.clone();
    // 创建一个"天空"向量, 朝向Y轴正方向
    const sky = pos.set(0, 1, 0);
    // 获取相机Z轴正方向的向量
    const cameraUp = camera.getWorldDirection();

    /**
     * 注意，这里有一个极端情况：
     * 如果在slam初始化的时候，体验者的手机相机是望向天空的一个状态，初始化后，不论手机怎么移动都无法获取相机朝向的正确向量值
     * 这个向量的 x,y,z 分别为 0,-1,0 的时候，体验者可能一开始就抬起相机望向了天空
     * **/
    const {x, y, z} = cameraUp;
    if(x === 0 && y === -1 && z === 0) {
      this.slam.removePlaneIndicator();

      // 无法正确获取相机的向量值，开发者需要自行处理怎么让体验者重新加载页面，这里只做一个简单的返回。
      return wx.showModal({
        title: "提示",
        content: "slam v1模式下, 初始化的时候请尽量让手机相机倾斜向下",
        showCancel: false,
        success() {
          wx.navigateBack();
        },
      });
    }

    const angleToSky = cameraUp.angleTo(sky);
    console.log("相机的Z轴与天空的夹角：", angleToSky);
    /**
     * 如果相机的Z轴向量与天空向量的夹角小于 90 度，那么相机就朝向天空
     * 注意：这个判断值可以根据需求自行调整
     * **/
    if (angleToSky < Math.PI / 2) {
      wx.showToast({ title: "朝向天空啦，请对准地面哟", icon: "none" });
    } else {
      wx.hideToast();
    }
  },

  // slam组件被点击
  slamTap({ touches, target }) {
    const { slam, model3d } = this;
    if (Array.isArray(touches) && touches.length > 0) {
      const { offsetLeft, offsetTop } = target;
      const { pageX, pageY } = touches[0];
      const posX = pageX - offsetLeft;
      const posY = pageY - offsetTop;

      let flag;
      if (model3d.visible) {
        // 模型已经显示，传入用户在kivicube-slam组件上点击到的坐标点
        flag = slam.standOnThePlane(model3d, posX, posY, true);
      } else {
        const { windowWidth, windowHeight } = wx.getSystemInfoSync();
        // 模型未显示，传入屏幕中心坐标点
        flag = slam.standOnThePlane(model3d, Math.round(windowWidth / 2), Math.round(windowHeight / 2), true);
      }

      if (flag) {
        if (!model3d.visible) {
          slam.removePlaneIndicator();
          model3d.visible = true;
        }
      } else {
        wx.showToast({ title: "请对准平面放置", icon: "none" });
      }
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
});
