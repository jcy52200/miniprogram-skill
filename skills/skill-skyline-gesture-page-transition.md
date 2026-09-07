---
name: "skyline-gesture-page-transition"
description: "在微信小程序 Skyline 渲染下生成「松手判定翻页 + 页面交叉淡入淡出」的全屏分页实现。当用户需要全屏分页切换、卡片式引导页、渐变翻页效果，或提到自定义手势识别、松手翻页时调用。"
---

# Skyline 松手翻页 + 交叉淡入淡出（微信小程序）

本 skill 将一套已在 Skyline 渲染下验证可用的完整实现（自定义手势识别 + 分页交叉淡入淡出时序控制）模板化。使用方（AI 或开发者）按本文档执行，即可在**任意微信小程序项目**中生成适配其情景的同款动画，全程不依赖原生 swiper / scroll-view。

## 一、效果与交互规则

1. **拖拽全程静止**：手指按下仅记录起始 Y 坐标，滑动过程中不更新任何视图（零 setData、零样式变更）。
2. **松手才判定**：松开时若滑动距离超过阈值（默认 80px），按方向（上滑下一页 / 下滑上一页）触发切换；不足阈值视为误触，什么都不做。
3. **页面级交叉淡入淡出**：当前页 opacity 1→0，目标页 0→1，时长一致（默认 400ms），同步执行形成平滑交叉效果，**无任何位移动画**。页内静态内容随页面一同过渡。
4. **边界行为**：第一页下滑、最后一页上滑不响应；切换动画期间全局手势锁屏蔽新输入。

## 二、使用本 skill 时必须先做的事（前置检查）

1. **确认目标项目形态**：TypeScript 还是 JavaScript（决定逻辑模板是否剥离类型）；页面数量与每页内容（背景图、静态文案、按钮）。
2. **图片资源检查（关键坑）**：本地图片文件名**严禁包含中文、空格等非 ASCII 字符**。Skyline 本地资源服务对 URL 编码后的中文路径会返回 500 导致图片加载失败。若目标项目素材命名不合规，先重命名为 `bg-1.jpg` 这类 ASCII 名称再引用。
3. **确认渲染模式**：目标项目是否已启用 Skyline。若未启用，按第三节配置；若必须兼容 WebView 回退（低版本基础库），touch 事件方案在两种渲染器下均可工作，但需在 WebView 下实测 `100vh` 与手势表现。
4. **素材尺寸**：背景图建议按主流机型分辨率（如 1125×2436）准备，配合 `mode="aspectFill"` 裁切。

## 三、渲染配置

### 3.1 全局 `app.json`（启用 Skyline）

```json
{
  "style": "v2",
  "componentFramework": "glass-easel",
  "lazyCodeLoading": "requiredComponents",
  "renderer": "skyline",
  "rendererOptions": {
    "skyline": {
      "defaultDisplayBlock": true,
      "defaultContentBox": true,
      "disableABTest": true,
      "sdkVersionBegin": "3.0.0",
      "sdkVersionEnd": "15.255.255"
    }
  },
  "window": {}
}
```

注意：Skyline 页面使用 custom 导航时，`app.json` 中 `window` 的 `navigationStyle`、`navigationBarTextStyle`、`navigationBarTitleText`、`navigationBarBackgroundColor` **均不生效**，保留会报警告，直接清空 `window` 配置即可。

### 3.2 页面配置 `页面.json`（封闭全屏交互区）

```json
{
  "usingComponents": {},
  "disableScroll": true,
  "navigationStyle": "custom"
}
```

`disableScroll: true` 禁用页面原生滚动，避免默认滚动行为与自定义分页手势冲突。

## 四、二层分层架构

从外到内两层，职责分离：

| 层 | 职责 | 实现 |
|---|---|---|
| 手势容器层 | 全屏最外层，只接收触摸、计算方向距离，不承载视觉 | 一个 `view` 绑定 touch 三事件 |
| 页面堆栈层 | 所有分页绝对定位层叠，仅 opacity 控制显隐，无位移 | `wx:for` 渲染 + `page-show` 类名 |

页内静态内容（文字、按钮等）直接放在页面堆栈层的每个 `.page` 内，随页面一起交叉淡入淡出，无需任何额外动画处理。

## 五、代码模板

以下模板为数据驱动结构，接入任意项目只需替换 `PAGES` 数组内容。TS 项目直接使用；JS 项目删除类型标注即可。

### 5.1 逻辑层（`index.ts`）

```ts
// 每页数据结构 —— 按目标项目情景自由增删字段
// bg 必须为 ASCII 文件名的本地路径或合法网络地址
interface PageSchema {
  bg: string
}

const PAGES: PageSchema[] = [
  { bg: '/images/bg-1.jpg' },
  { bg: '/images/bg-2.jpg' },
  // ……按目标项目页数增删
]

const SWITCH_THRESHOLD = 80  // 松手切换阈值（px）
const FADE_DURATION = 400    // 页面交叉淡入淡出时长（ms），必须与 WXSS 中 .page 的 transition 时长一致

Page({
  data: { pages: PAGES, current: 0 },

  animating: false,  // 全局动画锁
  startY: 0,
  unlockTimer: 0 as ReturnType<typeof setTimeout> | undefined,

  onUnload() {
    if (this.unlockTimer) clearTimeout(this.unlockTimer)
  },

  // —— 手势层：按下仅记录，滑动不更新视图，松手才判定 ——
  onTouchStart(e: WechatMiniprogram.TouchEvent) {
    this.startY = e.touches[0].clientY
  },

  onTouchMove() {
    // 严格遵循「拖拽全程静止」：滑动过程中不做任何处理
  },

  onTouchEnd(e: WechatMiniprogram.TouchEvent) {
    if (this.animating) return
    const dy = this.startY - e.changedTouches[0].clientY
    if (Math.abs(dy) < SWITCH_THRESHOLD) return // 误触
    const next = this.data.current + (dy > 0 ? 1 : -1)
    if (next < 0 || next >= PAGES.length) return // 边界不响应
    this.switchTo(next)
  },

  switchTo(next: number) {
    this.animating = true // 动画锁：切换期间屏蔽手势
    this.setData({ current: next })
    if (this.unlockTimer) clearTimeout(this.unlockTimer)
    this.unlockTimer = setTimeout(() => {
      this.animating = false // 过渡结束后留少量缓冲再解锁，防止边界竞态
    }, FADE_DURATION + 100)
  },
})
```

类型说明：小程序 typings 中**没有 DOM 的 `TouchEvent` 类型**，必须使用 `WechatMiniprogram.TouchEvent`，否则 tsc 编译失败。

### 5.2 结构层（`index.wxml`）

```xml
<!-- 第一层：手势容器层，只接收触摸，不承载视觉 -->
<view class="gesture-layer"
  bindtouchstart="onTouchStart"
  bindtouchmove="onTouchMove"
  bindtouchend="onTouchEnd"
  bindtouchcancel="onTouchEnd"
>
  <!-- 第二层：页面堆栈层，绝对定位层叠，仅 opacity 控制显隐 -->
  <view wx:for="{{pages}}" wx:key="index"
    class="page {{current === index ? 'page-show' : ''}}"
  >
    <image class="page-bg" src="{{item.bg}}" mode="aspectFill" />
    <!-- 页内静态内容随页面一同淡入淡出，可自由放置文字、按钮等并正常绑定 tap -->
  </view>

  <!-- 可选：页码指示点 -->
  <view class="dots">
    <view wx:for="{{pages}}" wx:key="index"
      class="dot {{current === index ? 'dot-active' : ''}}"
    ></view>
  </view>
</view>
```

### 5.3 样式层（`index.wxss`）

```css
/* ===== 第一层：手势容器层 ===== */
.gesture-layer {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #000;
}

/* ===== 第二层：页面堆栈层（仅 opacity 过渡，无位移） =====
 * ★ 可调参数：400ms 为页面交叉淡入淡出时长，
 *   修改时必须同步 index.ts 中的 FADE_DURATION 常量 */
.page {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 400ms ease;
}

.page-show { opacity: 1; }

.page-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

/* ===== 页码指示点 ===== */
.dots {
  position: absolute;
  right: 40rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.35);
  transition: background-color 300ms ease, transform 300ms ease;
}

.dot-active { background-color: #ffffff; transform: scale(1.35); }
```

## 六、参数总表与联动关系（改参必读）

| 参数 | 位置 | 默认值 | 作用 | 联动要求 |
|---|---|---|---|---|
| 页面淡入淡出时长 | WXSS `.page` 的 `transition: opacity 400ms` | 400ms | 页面交叉过渡实际时长 | **必须**与 `FADE_DURATION` 一致 |
| `FADE_DURATION` | TS 常量 | 400ms | 动画锁计时依据 | 与 WXSS 保持一致；CSS 调长而常量不变 → 锁提前释放、动画尾段可被打断；CSS 调短 → 锁多锁一会儿，无害但手感钝 |
| `SWITCH_THRESHOLD` | TS 常量 | 80px | 松手判定阈值 | 独立参数，无联动 |
| 解锁缓冲 | TS `switchTo` 中的 `+100` | 100ms | 过渡结束后的锁释放缓冲 | 一般无需调整，仅需 ≥0 |

**核心机制**：切换的唯一动作就是 `setData({ current })` 改类名，交叉过渡完全由 CSS transition 驱动；动画锁的屏蔽窗口 = `FADE_DURATION + 缓冲`。

## 七、已知坑与规避（实战验证）

1. **图片文件名含中文/空格 → Skyline 返回 500**：`_2_设计 G23_来自小红书.jpg` 这类命名经 URL 编码后本地资源服务加载失败，页面背景空白。**规避**：素材一律 ASCII 命名（如 `bg-1.jpg`）。
2. **`window` 导航栏配置警告**：Skyline + custom 导航下 `app.json` 的 `window.navigation*` 系列不生效，清空 `window` 配置即可消除。
3. **无 DOM 事件类型**：小程序 typings 中没有 `TouchEvent`，用 `WechatMiniprogram.TouchEvent`。
4. **快速连滑时序混乱**：全局 `animating` 锁 + 超时兜底解锁双保险；`touchcancel` 也绑定判定逻辑，处理手势被打断的场景。

## 八、按目标项目情景适配的定制点

生成代码时，根据目标项目实际情况调整以下维度：

1. **页数与内容**：增删 `PAGES` 数组项；每页字段可自由扩展（文案、图标、按钮等）。页内静态内容直接写在 `.page` 内，随页面一同交叉淡入淡出，交互元素可正常绑定 tap 事件。
2. **仅保留相邻页节点**：页数很多（>10）时，用 `wx:if` 只渲染当前页与前后相邻页，降低渲染压力。
3. **页内可滚动区域**：页面内部若有滚动内容，用 `scroll-view` 包裹并控制手势冒泡——内部滚动未到顶/底时不响应外层分页手势。
4. **性能红线**：所有动画只用 `opacity` 与 `transform`（Skyline 硬件加速，不触发重排），严禁引入 width/height/top/left 过渡。
5. **视觉样式**：指示点、背景裁切方式等按目标项目视觉稿自由替换，不影响动画逻辑。
6. **进阶手势方案**：若目标项目纯 Skyline 且追求极致响应，可用官方 `pan-gesture-handler` 替代 touch 事件（UI 线程处理，不受 JS 线程阻塞），回调声明为 worklet，仅在手势结束时触发切换逻辑；代价是失去 WebView 回退兼容性。

## 九、验收清单

实现完成后逐项自检：

- [ ] `app.json` 已启用 skyline + glass-easel + defaultDisplayBlock
- [ ] 页面 json 已设 `disableScroll: true` + `navigationStyle: "custom"`，且 `window` 无残留导航配置
- [ ] 所有图片文件名为纯 ASCII
- [ ] 拖拽过程中页面完全静止（无跟手位移、无透明度变化）
- [ ] 滑动不足 80px 松手无任何反应
- [ ] 切换为纯交叉淡入淡出，无位移动画
- [ ] 快速连续滑动不会产生时序错乱（动画锁生效）
- [ ] 第一页下滑、最后一页上滑无反应
- [ ] `FADE_DURATION` 与 WXSS 中 opacity 过渡时长一致
