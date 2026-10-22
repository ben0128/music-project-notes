# CS329Z Self-Study

自學 Stanford **CS329Z: Engineering AI Agents**（Fall 2026）的學習資料，用來追蹤進度、放筆記與工具腳本。課程沒有公開影片，但投影片、閱讀清單和 HW1 都是公開的。

- 課程首頁：https://cs329z.stanford.edu/
- HW1 starter（MIT 授權）：https://github.com/cs329z/assignment1-harness

> 這個資料夾只放腳本、書目連結和自己的筆記。投影片與論文 PDF 只下載到本機（已列在 `.gitignore`），著作權屬於原作者。

## 使用方式

```
.
├── readings.md                  # 每週閱讀清單（書目＋連結）
├── notes/                       # 自己的筆記，一講一檔
└── scripts/
    ├── download_slides.sh       # 投影片 → slides/lectureNN.pdf
    └── download_readings.sh     # readings.md 裡的 arXiv 論文 → readings/Wxx_<arXiv ID>.pdf
```

```bash
cd study/cs329z
./scripts/download_slides.sh
./scripts/download_readings.sh
```

兩支腳本都可以重複執行：已下載的檔案會跳過，投影片只有在遠端更新時才重抓。

## 課綱摘要

| 週 | 主題 | 重點 |
|---|---|---|
| 1 | 基礎與全景 | agentic system 的光譜、compound system 何時勝出、三大挑戰：拆解／資料／評估 |
| 2 | LLMs for Builders | decoding、context 長度、post-training、test-time scaling、structured output、context engineering |
| 2 | RAG | embedding、chunking、hybrid search、reranking；從零刻 RAG |
| 3 | Tool Use | function calling、MCP、工具設計、sandbox、錯誤處理 |
| 3 | 框架 | DSPy、LangGraph、LlamaIndex；框架替你抽象掉什麼 |
| 4 | Agent 設計模式 | workflow vs. agent、ReAct、plan-and-execute、reflection |
| 4 | Memory | 短期／長期記憶、記憶即工具、檔案系統當外部記憶 |
| 5 | Multi-agent | 編排、handoff、協作與錯誤傳播 |
| 5 | 最佳化 | prompt 最佳化（GEPA、MIPROv2）、test-time compute、LoRA、蒸餾 |
| 6 | Agent 的資料 | traces、feedback、data flywheel、合成資料 |
| 7 | 資料品質 | 資料篩選、小而精的 benchmark、從 trace 建資料集 |
| 7 | Eval 基礎 | request / environment / stopping criteria / scorer 四元組、benchmark 設計 |
| 8 | LLM-as-Judge | judge 設計與偏差、pass@k vs. pass^k、harness |
| 8 | 安全 | prompt injection、red-teaming、權限與 sandbox、human-in-the-loop |
| 9 | Coding Agents | SWE-agent、OpenHands、Claude Code 架構、SWE-bench |
| 11 | Proactive Agents | 主動 vs. 被動、mixed initiative |
| 11 | 前沿問題 | computer-use agent、長時間運作的 agent、observability |

第 6、9 週各有一場客座演講，第 10 週感恩節停課，期末週為 Demo Day。

## 學習計畫

- [ ] W1–2：讀 compound AI 與 Building Effective Agents 兩篇
- [ ] W2–4：跟著投影片進度，同時完成 HW1（需要自備 OpenRouter API key）
- [ ] W5–8：最佳化、資料、eval——搭配 CS329A 影片補深度
- [ ] W9–11：coding agent 與 proactive agent
- [ ] 自選 project：拆解 → 建 eval → 最佳化，寫一份設計取捨紀錄

## 延伸資源（有影片）

- Berkeley RDI Agentic AI MOOC（Fall 2025，YouTube 免費）— https://rdi.berkeley.edu/education
- Stanford CS329A Self-Improving AI Agents（Autumn 2025，YouTube 有錄影）— https://cs329a.stanford.edu/
- DeepLearning.AI《Agentic AI》（Andrew Ng，付費）— https://www.deeplearning.ai/courses/agentic-ai/
