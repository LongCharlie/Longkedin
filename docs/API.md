# Longkedin — API 设计文档

> 本文档定义 tRPC 路由、REST 端点、WebSocket 通道与消息队列协议。

---

## 目录

1. [API 协议概览](#1-api-协议概览)
2. [tRPC 路由设计](#2-trpc-路由设计)
3. [REST 端点](#3-rest-端点)
4. [WebSocket 通道](#4-websocket-通道)
5. [消息队列协议](#5-消息队列协议)
6. [错误码规范](#6-错误码规范)

---

## 1. API 协议概览

```
┌──────────────────────────────────────────────┐
│                  Client (Next.js)             │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  tRPC    │  │  REST    │  │  WebSocket  │ │
│  │ (主协议)  │  │ (上传等)  │  │ (语音面试)   │ │
│  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
└───────┼──────────────┼───────────────┼────────┘
        │              │               │
        ▼              ▼               ▼
┌──────────────────────────────────────────────┐
│              NestJS API Gateway               │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ tRPC     │  │ REST     │  │ WS Gateway  │ │
│  │ Router   │  │ Controller│  │              │ │
│  └──────────┘  └──────────┘  └─────────────┘ │
└──────────────────────────────────────────────┘
```

| 协议 | 用途 | 端口 | 路径 |
|------|------|------|------|
| **tRPC** | 核心业务 CRUD、状态变更 | 4000 | `/api/trpc/*` |
| **REST** | 文件上传、Webhook 回调、健康检查 | 4000 | `/api/rest/*` |
| **WebSocket** | 语音面试实时通信 | 4000 | `/ws/interview/:roomId` |
| **RabbitMQ** | AI Worker 异步任务 | 5672 | queues: `parse`, `match`, `interview` |

---

## 2. tRPC 路由设计

### 2.1 路由树

```
appRouter
├── auth           # 认证 (public)
│   ├── register
│   ├── login
│   ├── refreshToken
│   └── me
├── user           # 用户 (protected)
│   ├── getProfile
│   ├── updateProfile
│   └── deleteAccount
├── job            # 岗位 (protected)
│   ├── search          # 搜索岗位 (支持全文搜索 + 向量检索)
│   ├── getById
│   ├── save            # 保存到待投列表
│   ├── getRecommendations  # AI 推荐 (基于简历匹配)
│   └── import          # CSV 导入 / URL 添加
├── application    # 申请 (protected) — 核心模块
│   ├── create          # 创建申请 (幂等键)
│   ├── list            # 列表 (支持看板分组 + 筛选)
│   ├── getById
│   ├── updateStatus    # 状态转换 (Redlock)
│   ├── addNote         # 添加备注
│   └── getTimeline     # 时间线
├── resume         # 简历 (protected)
│   ├── upload          # 上传 (返回 presigned URL)
│   ├── confirmUpload   # 确认上传完成
│   ├── list            # 版本列表
│   ├── getById
│   ├── update          # 编辑器保存
│   ├── delete
│   └── getAnalysis     # AI 分析结果
├── match          # 匹配分析 (protected)
│   ├── analyze         # 发起匹配分析 (触发 Worker B)
│   ├── getResult       # 获取分析结果
│   └── generateCoverLetter  # 生成 Cover Letter
├── interview      # 面试 (protected)
│   ├── create          # 创建面试会话
│   ├── list
│   ├── getById
│   ├── getFeedback     # AI 反馈
│   └── getTranscript   # 转写文本
├── notification   # 通知 (protected)
│   ├── list
│   ├── markRead
│   └── updatePreferences
└── analytics      # 分析 (protected)
    ├── getOverview      # 总览 (转化漏斗)
    ├── getSkillGap      # 技能差距趋势
    └── getActivityLog   # 活动日志
```

### 2.2 关键 Procedure 示例

#### `application.create` — 创建申请 (幂等)

```typescript
// 输入 (Zod Schema)
const CreateApplicationInput = z.object({
  idempotencyKey: z.string().uuid(),   // 幂等键
  jobId: z.string().cuid(),
  resumeId: z.string().cuid(),
  notes: z.string().max(1000).optional(),
});

// 输出
const ApplicationOutput = z.object({
  id: z.string().cuid(),
  status: z.enum(["SAVED", "APPLIED", "PHONE_SCREEN", /* ... */]),
  jobId: z.string(),
  resumeId: z.string(),
  appliedAt: z.date(),
  createdAt: z.date(),
});
```

#### `application.updateStatus` — 状态转换 (分布式锁)

```typescript
// 输入
const UpdateStatusInput = z.object({
  applicationId: z.string().cuid(),
  targetStatus: z.enum([/* valid transitions */]),
  idempotencyKey: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// 后端逻辑 (伪代码)
// 1. Redis Redlock: `application:{id}:status`
// 2. 验证状态转换合法性 (状态机)
// 3. UPDATE ... SET status = ?, status_changed_at = NOW(), updated_by = ? WHERE id = ?
// 4. 写入 audit_log
// 5. 释放锁
// 6. 触发通知 (非阻塞)
```

---

## 3. REST 端点

### 3.1 文件上传

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/rest/resume/upload-url` | 获取 S3 presigned PUT URL | ✅ |
| `POST` | `/api/rest/resume/upload-complete` | S3 上传完成回调 | ✅ |

### 3.2 Webhook

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/rest/webhook/email` | 邮件解析回调 (SendGrid/Resend) |
| `POST` | `/api/rest/webhook/stripe` | Stripe 支付回调 |

### 3.3 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/rest/health` | 综合健康检查 (DB + Redis + MQ) |
| `GET` | `/api/rest/health/live` | K8s Liveness Probe |
| `GET` | `/api/rest/health/ready` | K8s Readiness Probe |

---

## 4. WebSocket 通道

### 4.1 语音面试实时通信

```
连接: ws://localhost:4000/ws/interview/:roomId?token=JWT

客户端 → 服务端 (上行):
  { type: "audio_frame", data: <base64 PCM16>, timestamp: number }
  { type: "end_speaking" }

服务端 → 客户端 (下行):
  { type: "transcript", text: string, is_final: boolean }
  { type: "question", text: string }          // AI 追问
  { type: "feedback", ... }                   // 完成后的结构化反馈
  { type: "error", code: string, message: string }
```

### 4.2 SSE (Server-Sent Events)

用于 AI 任务进度推送：

```
连接: GET /api/sse/task-progress?taskId=xxx (with JWT in Cookie)

事件:
  event: progress    data: {"taskId":"xxx","percent":60,"message":"正在提取技能关键词..."}
  event: completed   data: {"taskId":"xxx","result":{...}}
  event: error       data: {"taskId":"xxx","code":"AI_TIMEOUT","message":"AI 服务超时"}
```

---

## 5. 消息队列协议

### 5.1 任务消息格式

```json
{
  "taskId": "cuid_xxx",
  "taskType": "PARSE_RESUME | MATCH_JD | START_INTERVIEW",
  "userId": "cuid_xxx",
  "payload": {
    // task-type-specific
  },
  "metadata": {
    "idempotencyKey": "uuid",
    "traceId": "trace_xxx",
    "createdAt": "2026-06-01T00:00:00Z",
    "retryCount": 0,
    "maxRetries": 3
  }
}
```

### 5.2 队列定义

| 队列名 | 绑定 Exchange | 消费者 | 优先级 | TTL |
|--------|--------------|--------|--------|-----|
| `parse` | `ai.tasks` (routing: `parse`) | Worker A | normal | 10min |
| `match` | `ai.tasks` (routing: `match`) | Worker B | normal | 5min |
| `interview` | `ai.tasks` (routing: `interview`) | Worker C | high | 30min |
| `notification` | `notifications` (fanout) | Notification Router | normal | 1h |
| `dlq` | — (dead-letter) | Alert Monitor | low | 7d |

---

## 6. 错误码规范

### 6.1 tRPC 错误码 (继承自 tRPC Error Codes)

```typescript
const ErrorCodes = {
  // 客户端错误 (4xx)
  BAD_REQUEST:          "BAD_REQUEST",        // 参数校验失败
  UNAUTHORIZED:         "UNAUTHORIZED",       // 未登录
  FORBIDDEN:            "FORBIDDEN",          // 无权限
  NOT_FOUND:            "NOT_FOUND",          // 资源不存在
  CONFLICT:             "CONFLICT",           // 冲突 (幂等键/状态转换)
  TOO_MANY_REQUESTS:    "TOO_MANY_REQUESTS",  // 限流

  // 服务端错误 (5xx)
  INTERNAL_SERVER_ERROR:"INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE:  "SERVICE_UNAVAILABLE", // AI 服务降级
  TIMEOUT:              "TIMEOUT",             // 上游超时
} as const;
```

### 6.2 错误响应格式

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Invalid status transition: PHONE_SCREEN → OFFER",
    "details": {
      "currentStatus": "PHONE_SCREEN",
      "targetStatus": "OFFER",
      "validTransitions": ["TECHNICAL_INTERVIEW", "REJECTED"]
    },
    "traceId": "trace_abc123"
  }
}
```

---

## 附录 A: tRPC 调用示例 (前端)

```typescript
// Server Component 中调用
import { api } from '@/lib/trpc/server';

export default async function JobPage({ params }: { params: { id: string } }) {
  const job = await api.job.getById({ id: params.id });
  const match = await api.match.getResult({ jobId: params.id });

  return (
    <div>
      <JobDetail job={job} />
      <MatchScore score={match.score} missingSkills={match.missingSkills} />
    </div>
  );
}

// Client Component 中调用
'use client';
import { trpc } from '@/lib/trpc/client';

export function ApplyButton({ jobId, resumeId }: { jobId: string; resumeId: string }) {
  const utils = trpc.useUtils();
  const mutation = trpc.application.create.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate();
      toast.success('申请已提交');
    },
  });

  return (
    <Button
      onClick={() => mutation.mutate({
        jobId,
        resumeId,
        idempotencyKey: crypto.randomUUID(),
      })}
      loading={mutation.isPending}
    >
      一键投递
    </Button>
  );
}
```
