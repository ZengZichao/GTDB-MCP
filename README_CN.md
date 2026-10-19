# GTDB-MCP

**基因组分类数据库 (GTDB) 的模型上下文协议 (MCP) 服务器**

[English](./README.md) | 中文文档

---

> ⚠️ **免责声明**：本项目是**非官方的第三方**社区实现，**不**隶属于、也不受 [GTDB 团队](https://gtdb.ecogenomic.org/) 或 [Anthropic](https://www.anthropic.com/) 认可或关联。GTDB 由昆士兰大学澳大利亚生态基因组学中心 (ACE) 开发。本项目独立构建了一个 MCP 服务器，以方便访问 GTDB 数据。所有 GTDB 数据及商标权归各自所有者所有。

---

## 📋 目录

- [概述](#概述)
- [功能特性](#功能特性)
- [可用工具](#可用工具)
- [安装](#安装)
- [配置](#配置)
- [使用方法](#使用方法)
- [与 MCP 客户端集成](#与-mcp-客户端集成)
- [数据来源](#数据来源)
- [开发指南](#开发指南)
- [许可证](#许可证)

---

## 概述

**GTDB-MCP** 是一个模型上下文协议 (MCP) 服务器，提供对 [基因组分类数据库 (GTDB)](https://gtdb.ecogenomic.org/) 的无缝访问。它使基于大语言模型 (LLM) 的应用程序能够查询细菌和古菌的分类数据、搜索基因组、导航系统发育树，以及执行比较分析。

GTDB 是一个基于基因组的分类数据库，利用 120 多个保守标记基因为细菌和古菌基因组提供标准化的分类。本 MCP 服务器使 GTDB 数据能够被 AI 助手和其他兼容 MCP 的工具访问。

### 核心亮点

- **零配置启动**：内置精选参考数据集，覆盖主要的细菌和古菌分类群
- **完整数据库支持**：可加载完整的 GTDB TSV 数据文件进行全面查询
- **12 个强大工具**：搜索、分类查询、基因组查询、树导航和比较分析
- **类型安全**：使用 TypeScript 编写，提供完整类型定义
- **MCP 合规**：遵循模型上下文协议规范进行基于工具的交互

---

## 功能特性

### 🔍 搜索与发现
- 按名称搜索分类群或基因组（支持部分匹配）
- 按分类层级浏览（门、纲、目、科、属、种）
- 列出细菌或古菌的所有门

### 🌿 分类导航
- 获取完整的分类谱系（域 → 种）
- 获取分类群摘要，包含基因组数量和子分类群
- 导航分类树（获取任意分类群的子分类群）
- 查找两个分类群之间的系统发育路径

### 🧬 基因组信息
- 查询基因组元数据（大小、GC 含量、质量、模式菌株状态）
- 查找某物种的所有基因组
- 查找任意分类群下的所有基因组

### 📊 比较与分析
- 比较两个基因组的分类关系（共享谱系、最近共同祖先、差异）
- 获取分类群之间的系统发育树路径
- 访问数据库全局统计信息

---

## 可用工具

| 工具名称 | 描述 |
|---------|------|
| `search` | 按名称搜索分类群或基因组 |
| `get_taxonomy` | 获取分类群或基因组的完整分类谱系 |
| `get_taxon_summary` | 获取分类群的综合性摘要 |
| `get_children` | 获取指定分类群的直接子分类群 |
| `list_phyla` | 列出所有细菌或古菌的门 |
| `list_taxa_by_rank` | 列出指定分类层级的所有分类群 |
| `get_genome` | 按 GTDB ID 获取基因组详细信息 |
| `get_genomes_for_species` | 获取某物种的所有基因组 |
| `get_genomes_for_taxon` | 获取某分类群下的所有基因组 |
| `compare_genomes` | 比较两个基因组的分类关系 |
| `get_tree_path` | 获取两个分类群之间的系统发育路径 |
| `get_database_stats` | 获取 GTDB 数据库统计信息 |

---

## 安装

### 前置条件

- **Node.js** >= 18.0.0
- **npm** 或 **yarn**

### 从源码安装

```bash
git clone <仓库地址>
cd GTDB-MCP
npm install
npm run build
```

### 全局安装（可选）

```bash
npm install -g .
```

---

## 配置

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `GTDB_DATA_DIR` | 外部 GTDB 数据目录路径 | （无 - 使用内置数据） |

### 使用内置数据

默认情况下，服务器使用精选的内置参考数据集，覆盖范围包括：

- **10 个细菌门**（厚壁菌门、假单胞菌门、放线菌门、拟杆菌门、螺旋体门、蓝细菌门、衣原体门、梭杆菌门、支原体门、弯曲杆菌门）
- **6 个古菌门**（产甲烷菌门、热变形菌门、甲烷微菌门、盐杆菌门、纳古菌门、热原体门）
- **100+ 代表性分类群**，覆盖所有分类层级
- **25+ 参考基因组**，含元数据

### 使用完整 GTDB 数据

如需访问完整数据库，请从 [https://gtdb.ecogenomic.org/downloads](https://gtdb.ecogenomic.org/downloads) 下载 GTDB 数据文件，并设置数据目录：

```bash
# 设置数据目录
export GTDB_DATA_DIR=/path/to/gtdb/data

# 数据目录中应包含以下文件：
# - bac120_taxonomy.tsv（细菌分类数据）
# - ar122_taxonomy.tsv（古菌分类数据）
```

---

## 使用方法

### 启动服务器

```bash
# 使用内置数据
node dist/index.js

# 使用外部 GTDB 数据
GTDB_DATA_DIR=/path/to/gtdb/data node dist/index.js
```

### 编程接口

```typescript
import { GTDBClient } from "gtdb-mcp";

const client = new GTDBClient();

// 搜索生物
const results = client.search("Bacillus");

// 获取分类信息
const lineage = client.getLineage("Escherichia coli");

// 获取分类群摘要
const summary = client.getTaxonSummary("Enterobacteriaceae");

// 比较基因组
const comparison = client.compareGenomes("GCF_000005845.2", "GCF_000007865.2");
```

---

## 与 MCP 客户端集成

### Claude Desktop

将服务器添加到 Claude Desktop 配置文件 (`claude_desktop_config.json`)：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gtdb": {
      "command": "node",
      "args": ["/绝对路径/GTDB-MCP/dist/index.js"]
    }
  }
}
```

### 使用外部 GTDB 数据

```json
{
  "mcpServers": {
    "gtdb": {
      "command": "node",
      "args": ["/绝对路径/GTDB-MCP/dist/index.js"],
      "env": {
        "GTDB_DATA_DIR": "/path/to/gtdb/data"
      }
    }
  }
}
```

### 示例查询

连接成功后，你可以向 AI 助手提出以下问题：

- "大肠杆菌（Escherichia coli）的分类是什么？"
- "列出 GTDB 中所有的细菌门"
- "比较基因组 GCF_000005845.2 和 GCF_000007865.2"
- "芽孢杆菌目（Bacillales）的子分类群有哪些？"
- "查找肠杆菌科（Enterobacteriaceae）的所有基因组"
- "显示从芽孢杆菌属（Bacillus）到埃希氏菌属（Escherichia）的系统发育路径"
- "获取 GTDB 数据库的统计信息"

---

## 数据来源

### GTDB 分类格式

GTDB 使用带层级前缀的标准化分类格式：

```
d__域;p__门;c__纲;o__目;f__科;g__属;s__种
```

示例：
```
d__Bacteria;p__Pseudomonadota;c__Gammaproteobacteria;o__Enterobacterales;f__Enterobacteriaceae;g__Escherichia;s__Escherichia coli
```

### 基因组标识符

GTDB 使用 NCBI 组装访问号作为基因组标识符：

- `GCF_` 前缀：RefSeq 组装
- `GCA_` 前缀：GenBank 组装
- `UBA_` 前缀：未分类分箱组装
- `G_` 前缀：GTDB 为非 NCBI 基因组分配的标识符

### 分类层级

GTDB 遵循七级分类体系：

1. **域 (Domain)** (d__) - 细菌或古菌
2. **门 (Phylum)** (p__) - 如厚壁菌门、假单胞菌门
3. **纲 (Class)** (c__) - 如芽孢杆菌纲、γ-变形菌纲
4. **目 (Order)** (o__) - 如芽孢杆菌目、肠杆菌目
5. **科 (Family)** (f__) - 如芽孢杆菌科、肠杆菌科
6. **属 (Genus)** (g__) - 如芽孢杆菌属、埃希氏菌属
7. **种 (Species)** (s__) - 如枯草芽孢杆菌、大肠杆菌

---

## 开发指南

### 项目结构

```
GTDB-MCP/
├── package.json              # 项目配置和依赖
├── tsconfig.json             # TypeScript 配置
├── README.md                 # 英文文档
├── README_CN.md              # 中文文档（本文件）
├── LICENSE                   # MIT 许可证
├── src/
│   ├── index.ts              # MCP 服务器入口
│   ├── types.ts              # TypeScript 类型定义
│   ├── taxonomy.ts           # 分类层级定义和工具函数
│   ├── gtdb-client.ts        # GTDB 数据库客户端（核心逻辑）
│   ├── test.ts               # 测试套件
│   └── data/
│       └── reference-data.ts # 内置参考分类数据
└── dist/                     # 编译输出（自动生成）
```

### 构建

```bash
npm run build      # 编译 TypeScript
npm run dev        # 开发模式（监听变化）
npm run clean      # 清理 dist 目录
```

### 测试

```bash
npm run build      # 先编译
node dist/test.js  # 运行测试套件
```

### 添加新分类群

要向内置参考数据中添加新分类群，请编辑 `src/data/reference-data.ts`，在 `BUILTIN_TAXONOMY` 数组中添加条目：

```typescript
{
  name: "你的分类群名称",
  rank: "genus",  // 分类层级
  domain: "Bacteria",  // 域
  lineage: makeLineage("Bacteria", "门名", "纲名", "目名", "科名", "你的分类群名称", ""),
  genomeCount: 1000,  // 基因组数量
  speciesCount: 200,  // 物种数量
  children: ["种1", "种2"],  // 子分类群
  description: "此分类群的简要描述。"
}
```

---

## 许可证

本项目基于 MIT 许可证发布 - 详情请参阅 [LICENSE](./LICENSE) 文件。

---

## 致谢

- [GTDB（基因组分类数据库）](https://gtdb.ecogenomic.org/) - Parks 等，Nature Biotechnology 2018, 2020, 2022
- [模型上下文协议 (MCP)](https://modelcontextprotocol.io/) - Anthropic
- GTDB 由昆士兰大学澳大利亚生态基因组学中心 (ACE) 开发

---

**版本**：0.1.0  
**GTDB 版本**：R220 (2024-04-17)
