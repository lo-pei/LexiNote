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
    source: "人工审校台（translation_templates，status=APPROVED）；哈希匹配，命中即返回"
    ai_draft: "未命中且已配置模型时，学生可点「AI 试译」按需生成；草稿 status=AI_DRAFT"
    review_gate: "AI 草稿必须经教师审校转为 APPROVED 才视为正式译文；驳回的句子不再重复生成"
    fallback: "无人工译文且模型不可用时显示「暂无预置译文」，不报错"

media:
  flowchart: { library: "React Flow 兼容 JSON", editable_roles: [teacher], student_mode: "readonly" }
  image: { max_size_mb: 5, allowed_types: [jpg, png, webp] }

wordbook:
  source_required: true
  multi_wordbook: true
  export_formats: [xlsx, docx, pdf]
`;
