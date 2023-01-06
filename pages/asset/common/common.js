import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
      ),
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/reticle.glb"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer, reticleArrayBuffer] = await this.downloadAsset;
      const [rabbitModel, reticleModel] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
        slam.createGltfModel(reticleArrayBuffer),
      ]);

      reticleModel.name = "Kivisense reticle";
      rabbitModel.name = "Kivisense rabbit";

      // 所有的3D对象，都可以作为容器，将其他3D对象放进自己的子节点之中。
      // 如果被增加的对象，已经放入了其他容器中，那在add时，会自动从其他容器中移除。【slam.add也有一样的特性。】
      // 可以将所有对象的包含关系，想象成一棵树。【对于模型素材对象，天然存在子对象，而其他素材对象则没有，需要自行添加】
      // 子对象会自然而然随着父对象的变化而变化【比如父对象放大，子对象会以同等比例放大】。

      reticleModel.position.y = -0.01;
      reticleModel.scale.setScalar(0.25);
      // 插件>=1.0.1支持
      rabbitModel.add(reticleModel);
      // 也可以移除。插件>=1.0.1支持
      // rabbitModel.remove(reticleModel);

      // 可获取3D对象的子对象列表。子对象也拥有当前代码文件中示例的所有API和功能，甚至也能获取子对象。
      // 插件>=1.0.1支持
      const childern = rabbitModel.getChildren();
      console.log(childern); // 输出数组列表
      console.log(childern[childern.length - 1] === reticleModel); // 输出true

      // 监听模型被点击的事件
      reticleModel.addEventListener("click", function(e) {
        // 使点击到子对象时，阻止事件冒泡，避免父对象的点击事件触发。
        e.stopPropagation();
        wx.showToast({
          icon: "none",
          title: `${this.name}被点击`,
        });
      });
      rabbitModel.addEventListener("click", function() {
        wx.showToast({
          icon: "none",
          title: `${this.name}被点击`,
        });
      });
      // 同时存在hasEventListener、removeEventListener、dispatchEvent方法。
      // 可参考：https://threejs.org/docs/index.html#api/en/core/EventDispatcher

      // add方法调用时，如果指定了初始大小和朝向，则会将大小和朝向值，直接设置在对象的scale和rotation.y属性上。
      // 因此要注意：add方法有时会改变对象的scale和rotation(或quaternion)属性值。
      slam.add(rabbitModel, 0.5);

      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        rabbitModel,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

      this.rabbit = rabbitModel;

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
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

  enableOnBeforeRender() {
    const { rabbit } = this;
    let initScale;
    // 使用渲染钩子函数，实现自动3D变换。
    // 注意：当屏幕上看不见此兔子时，则不会调用此方法。
    // 比如我们背对兔子时，因为此时不需要渲染兔子，所以不需要调用。
    rabbit.onBeforeRender = () => {
      // rotation对象参考：https://threejs.org/docs/index.html#api/en/math/Euler
      rabbit.rotation.y += 0.01;
      // 也支持使用四元数进行旋转。注意：rotation和quaternion是联动的，其中一个值被修改，另一个值也会同步更改。
      // quaternion对象参考：https://threejs.org/docs/index.html#api/en/math/Quaternion
      rabbit.quaternion.x += 0.01;

      // 使用position对象进行位移。参考：https://threejs.org/docs/index.html#api/en/math/Vector3
      rabbit.position.y += 0.01;
      if (rabbit.position.y > 1) {
        rabbit.position.y = 0;
      }

      if (!initScale) {
        initScale = rabbit.scale.clone();
      }
      // 使用scale对象修改对象大小。参考：https://threejs.org/docs/index.html#api/en/math/Vector3
      rabbit.scale.addScalar(0.01);
      if (rabbit.scale.x > initScale.x + 2) {
        rabbit.scale.copy(initScale);
      }
    };
    // 同样存在渲染后钩子函数
    // rabbit.onAfterRender = () => {};
  },
  disableOnBeforeRender() {
    const { rabbit } = this;
    delete rabbit.onBeforeRender;
  },

  // 隐藏和显示
  hide() {
    this.rabbit.visible = false;
  },
  show() {
    this.rabbit.visible = true;
  },

  lookAt() {
    // 旋转模型，使模型的Z轴朝向某个3D坐标点。
    this.rabbit.lookAt(0, 0, 0);
  },

  onUnload() {
    this.rabbit = null;
  },
});
