# Longkedin — 开发指南 (Development Guide)

> 本文档涵盖本地开发环境搭建、代码规范、Git 工作流与常见问题。

---

## 目录

1. [环境要求](#1-环境要求)
2. [快速开始](#2-快速开始)
3. [项目结构详解](#3-项目结构详解)
4. [开发工作流](#4-开发工作流)
5. [代码规范](#5-代码规范)
6. [测试策略](#6-测试策略)
7. [常见问题](#7-常见问题)

---

## 1. 环境要求

### 必备工具

| 工具 | 最低版本 | 用途 | 安装命令 |
|------|----------|------|----------|
| Node.js | >= 20.0.0 | JavaScript 运行时 | `nvm install 20` |
| pnpm | >= 9.0.0 | 包管理器 (monorepo) | `npm i -g pnpm@latest` |
| Docker Desktop | >= 25.0 | 本地服务编排 | [docker.com](https://docker.com) |
| Python | >= 3.12.0 | AI Worker | `pyenv install 3.12` |
| Git | >= 2.40 | 版本控制 | [git-scm.com](https://git-scm.com) |
| VS Code | Latest | IDE | [code.visualstudio.com](https://code.visualstudio.com) |

### 推荐 VS Code 插件

在 `.vscode/extensions.json` 中已配置推荐：

- ESLint / Prettier
- Prisma
- Tailwind CSS IntelliSense
- Error Lens
- GitLens
- Thunder Client (API 测试)

---

## 2. 快速开始

### 2.1 克隆与安装

```bash
git clone <repo-url> longkedin
cd longkedin

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key (至少 OPENAI_API_KEY)

# 一键安装依赖
pnpm install

# 启动所有基础设施 (PostgreSQL, Redis, RabbitMQ, MinIO)
pnpm docker:dev

# 初始化数据库
pnpm db:generate   # 生成 Prisma Client
pnpm db:push       # 推送 Schema 到 DB
pnpm db:seed       # 填充种子数据

# 启动所有服务 (前端 + 后端 + Worker)
pnpm dev
```

### 2.2 验证安装

| 服务 | URL | 状态检查 |
|------|-----|----------|
| Web 前端 | http://localhost:3000 | 浏览器打开，可见 Landing Page |
| API 健康检查 | http://localhost:4000/api/health | 返回 `{"status":"ok"}` |
| tRPC Playground | http://localhost:4000/api/trpc-playground | 可测试 tRPC 接口 |
| Worker A 健康检查 | http://localhost:8001/health | 返回 model loaded 状态 |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| RabbitMQ Dashboard | http://localhost:15672 | guest / guest |

### 2.3 目录结构速览

```
longkedin/
├── apps/
│   ├── web/                    # ← 前端: Next.js 15 App Router
│   │   ├── src/app/            #    页面路由 (Server Components)
│   │   ├── src/components/     #    UI 组件
│   │   ├── src/features/       #    业务功能模块
│   │   ├── src/hooks/          #    自定义 Hooks
│   │   ├── src/stores/         #    Zustand Stores
│   │   ├── src/lib/            #    工具函数
│   │   └── e2e/                #    Playwright E2E 测试
│   ├── api/                    # ← 后端: NestJS 11
│   │   ├── src/modules/        #    业务模块 (auth, job, resume...)
│   │   ├── src/common/         #    横切关注点 (guards, interceptors...)
│   │   ├── src/trpc/           #    tRPC 路由
│   │   └── prisma/             #    Prisma Schema & Migrations
│   └── workers/                # ← AI Workers: Python FastAPI
│       ├── worker_resume/      #    Worker A: 简历/JD 解析
│       ├── worker_match/       #    Worker B: 匹配分析
│       └── worker_interview/   #    Worker C: 面试模拟
├── packages/
│   ├── shared-types/           #    共享 TypeScript 类型 (Zod schemas)
│   └── eslint-config/          #    共享 ESLint 配置
├── infra/
│   ├── docker/                 #    Docker Compose 配置
│   └── terraform/              #    Infrastructure as Code
├── docs/                       #    项目文档
├── scripts/                    #    自动化脚本
├── .github/workflows/          #    CI/CD Pipeline
├── turbo.json                  #    Turborepo 配置
└── pnpm-workspace.yaml         #    pnpm Workspace 定义
```

---

## 3. 项目结构详解

### 3.1 Monorepo 工具链

| 工具 | 用途 |
|------|------|
| **pnpm Workspaces** | 多包管理，共享依赖提升 |
| **Turborepo** | 并行构建、缓存、增量任务 |
| **Husky + lint-staged** | Pre-commit 钩子：自动 lint + format |
| **Commitlint** | Conventional Commits 规范 |

### 3.2 包依赖关系

```
apps/web ─────→ packages/shared-types
apps/api ─────→ packages/shared-types
apps/api ─────→ packages/eslint-config (dev)
apps/web ─────→ packages/eslint-config (dev)
```

`shared-types` 包包含所有 Zod Schema 定义，确保前后端类型一致。

---

## 4. 开发工作流

### 4.1 Git 分支策略

```
main          ← 生产就绪 (受保护)
  ├─ develop  ← 集成分支
  │   ├─ feat/LLK-001-add-kanban-dnd     ← 功能分支
  │   ├─ fix/LLK-042-fix-resume-upload    ← 修复分支
  │   └─ chore/LLK-099-update-deps        ← 杂项分支
  └─ hotfix/LLK-100-fix-crash             ← 紧急修复
```

### 4.2 Conventional Commits

```
feat(job): add multi-source job aggregation
fix(resume): handle PDF parsing timeout gracefully
refactor(interview): extract audio processing to shared lib
docs(api): add tRPC procedure documentation
test(application): add state machine transition tests
chore(deps): bump next to 15.1.0
```

### 4.3 添加新功能的标准流程

```bash
# 1. 从 develop 创建功能分支
git checkout develop && git pull
git checkout -b feat/LLK-XXX-description

# 2. 如果是新数据模型，先更新 Prisma Schema
# 编辑 apps/api/prisma/schema.prisma
pnpm db:generate
pnpm db:push

# 3. 开发后端 tRPC 路由
# 编辑 apps/api/src/trpc/routers/xxx.router.ts

# 4. 开发前端页面
# 编辑 apps/web/src/app/(dashboard)/xxx/page.tsx

# 5. 编写测试
pnpm test            # 单元测试
pnpm test:e2e        # E2E 测试 (需要 Docker 运行)

# 6. 提交 (Husky 会自动运行 lint-staged)
git add .
git commit -m "feat(xxx): description"

# 7. 推送并创建 PR
git push origin feat/LLK-XXX-description
# 在 GitHub 创建 PR → develop
```

---

## 5. 代码规范

### 5.1 TypeScript

- 严格模式 (`strict: true`)
- 禁止 `any` (eslint: `@typescript-eslint/no-explicit-any: error`)
- 优先使用 `interface` 而非 `type` (对象形状)
- 使用 `satisfies` 操作符而非类型断言

### 5.2 React / Next.js

- **Server Components First**: 默认使用 Server Component，仅在需要交互时添加 `'use client'`
- **数据获取**: 在 Server Component 中直接调用 tRPC caller，避免 `useEffect` fetch
- **Props 排序**: `className` → `children` → 业务 props → 事件 handlers
- **组件文件**: 一个文件一个组件，文件名 = 组件名 (PascalCase)

### 5.3 NestJS

- **模块化**: 每个功能模块独立 folder，包含 module / controller / service / dto
- **依赖注入**: 使用 Constructor Injection，禁止 Service Locator 模式
- **DTO 校验**: 使用 Zod Schema (全局 ZodValidationPipe)
- **异常处理**: 使用 NestJS 内置异常类 (`NotFoundException`, `BadRequestException`)

### 5.4 Python (AI Workers)

- 使用 `ruff` 作为 linter + formatter (替代 flake8 + black)
- Type hints 覆盖率 > 90%
- 异步 IO: 使用 `asyncio` + `aio_pika` (RabbitMQ client)

---

## 6. 测试策略

### 6.1 测试金字塔

```
         ┌──────┐
         │ E2E  │  ← Playwright (关键用户旅程)
         ├──────┤
         │ Int. │  ← Supertest + Testcontainers (API 集成测试)
         ├──────┤
         │ Unit │  ← Vitest / pytest (函数 & 组件)
         └──────┘
```

### 6.2 测试覆盖率目标

| 层级 | 工具 | 覆盖率目标 | 运行命令 |
|------|------|-----------|----------|
| 前端单元 | Vitest + Testing Library | ≥ 80% | `pnpm test --filter=web` |
| 前端 E2E | Playwright | 核心流程 100% | `pnpm test:e2e --filter=web` |
| 后端单元 | Vitest | ≥ 85% | `pnpm test --filter=api` |
| 后端集成 | Supertest + Testcontainers | 关键 API 100% | `pnpm test:int --filter=api` |
| Worker | pytest | ≥ 80% | `cd apps/workers && pytest` |

### 6.3 E2E 核心场景

1. 用户注册 → 登录 → 首次引导
2. 上传简历 → 等待 AI 解析 → 查看解析结果
3. 浏览岗位 → 查看匹配度 → 一键生成 Cover Letter
4. 投递申请 → 看板拖拽更新状态
5. 进入面试舱 → 录音 → 查看 AI 反馈

---

## 7. 常见问题

### Q1: Docker Compose 启动失败，端口冲突？

```bash
# 检查端口占用
netstat -ano | findstr "5432 6379 5672 9000"

# 修改 docker-compose.dev.yml 中端口映射
# 或停止占用端口的服务
```

### Q2: Prisma migration 冲突？

```bash
# 重置开发数据库
pnpm db:push --force-reset
pnpm db:seed
```

### Q3: AI Worker 连接不到 OpenAI API？

```bash
# 确保 .env 中 OPENAI_API_KEY 已配置
# 如果在国内开发，需要配置 HTTPS_PROXY
set HTTPS_PROXY=http://127.0.0.1:7890
```

### Q4: 如何只开发前端，不启动 AI Worker？

```bash
# 仅启动 Web + API
pnpm dev --filter=web --filter=api --filter=@longkedin/shared-types
```

### Q5: 如何添加新的 AI 模型？

1. 更新 `apps/workers/shared/model_registry.py`
2. 添加新的 Worker 或扩展现有 Worker
3. 在 NestJS 中新增对应的 Queue Producer
4. 更新 `.env.example` 添加新的 API Key
