/* ==========================================================================
   数学讲解师 · 内容配置
   --------------------------------------------------------------------------
   整站只有 7 讲：
   · 1 讲「高中数学思维重构课」（先导课）
   · 6 个板块，每个板块 1 讲完整视频

   每个板块只需要改两件事：名称、视频代码。

   ★ 怎么接视频？
   把视频平台后台的「播放器代码 / iframe 代码」整段粘贴到对应板块的 video 字段：

     video: `<iframe src="https://你的播放器地址/embed/xxxx" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`

   也可以只填链接：

     video: "https://你的播放器地址/embed/xxxx"

   留空（video: ""）会显示「视频即将上线」的占位画面。
   建议使用 iframe 代码，兼容性最好。

   ★ 可选字段：
   poster: "封面图网址"  —— 不填则自动生成星云渐变封面
   ========================================================================== */

window.MATH_DATA = {
  /* 先导课：高中数学思维重构课 */
  featured: {
    id: "thinking",
    name: "高中数学思维重构课",
    en: "REBUILDING MATHEMATICAL THINKING",
    label: "先导课",
    glyph: "∞",
    color: "#E3C27E",
    rgb: "227,194,126",
    video: "",
    poster: ""
  },

  /* 六大板块：每个板块一个总视频 */
  modules: [
    {
      id: "function",
      name: "函数与导数",
      en: "FUNCTIONS & DERIVATIVES",
      glyph: "ƒ",
      color: "#7FD8FF",
      rgb: "127,216,255",
      video: "",
      poster: ""
    },
    {
      id: "trig",
      name: "三角函数",
      en: "TRIGONOMETRY",
      glyph: "∿",
      color: "#E3C27E",
      rgb: "227,194,126",
      video: "",
      poster: ""
    },
    {
      id: "sequence",
      name: "数列",
      en: "SEQUENCES & SERIES",
      glyph: "Σ",
      color: "#A48CFF",
      rgb: "164,140,255",
      video: "",
      poster: ""
    },
    {
      id: "solid",
      name: "立体几何",
      en: "SOLID GEOMETRY",
      glyph: "◈",
      color: "#6FE3C1",
      rgb: "111,227,193",
      video: "",
      poster: ""
    },
    {
      id: "analytic",
      name: "解析几何",
      en: "ANALYTIC GEOMETRY",
      glyph: "⊚",
      color: "#F2A6A0",
      rgb: "242,166,160",
      video: "",
      poster: ""
    },
    {
      id: "probability",
      name: "概率统计",
      en: "PROBABILITY & STATISTICS",
      glyph: "∴",
      color: "#9FB4FF",
      rgb: "159,180,255",
      video: "",
      poster: ""
    }
  ]
};
