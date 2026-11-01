/** Skill 初始配置（说明书 §8）。Web 端按区段渲染为表单，保存时回写并递增 version。 */
export const skillYaml = `skill:
  name: legal-english-note-editing
  version: "1.0"
  description: "法律英语课件与笔记的编辑、标注、侧栏与精读规则"

term_annotation:
  scope:
    - "法律术语（tort, consideration, jurisdiction 等）"
    - "拉丁语法律短语（mens rea, actus reus, stare decisis 等）"
    - "固定法律搭配（burden of proof, beyond reasonable doubt 等）"
  required_fields:
    phonetic: "IPA 音标"
    definition: "中文释义，优先使用中国大陆法学通用译法"
  style:
    underline: "dashed"
    hover_color: "#a8291f"
  example: |
    节点类型：legalTerm
    attrs: { phonetic: "/ˈmenz ˈriːə/", definition: "犯罪意图" }

sidebar:
  types:
    extension: { label: "扩展知识", allowed_levels: [required, optional] }
    article:   { label: "相关文章", allowed_levels: [required, optional] }
  required_marking:
    permission: "仅教师可设置 required/optional"
    student_display: "只读展示徽章"
  max_required_per_section: 3
  sort_rule: "必读在前，选读在后；同级按 sortOrder 升序"

intensive_reading:
  sentence_click:
    enabled: true
    popover_sections: [original, translation, term_breakdown, add_to_vocabulary]
  translation:
    source: "预置模板（translation_templates），哈希匹配，不调用外部 API"
    fallback: "显示「暂无预置译文」，不报错"

media:
  flowchart: { library: "React Flow 兼容 JSON", editable_roles: [teacher], student_mode: "readonly" }
  image: { max_size_mb: 5, allowed_types: [jpg, png, webp] }

wordbook:
  source_required: true
  multi_wordbook: true
  export_formats: [xlsx, docx, pdf]
`;
