---
title: '配置文件介绍'
description: 'FastGPT 配置参数介绍'
icon: 'settings'
draft: false
toc: true
weight: 708
---

由于环境变量不利于配置复杂的内容，新版 FastGPT 采用了 ConfigMap 的形式挂载配置文件，你可以在 `projects/app/data/config.json` 看到默认的配置文件。可以参考 [docker-compose 快速部署](/docs/development/docker/) 来挂载配置文件。

**开发环境下**，你需要将示例配置文件 `config.json` 复制成 `config.local.json` 文件才会生效。

这个配置文件中包含了系统参数和各个模型配置：

## 4.6.8+ 版本新配置文件

llm模型全部合并

```json
{
  "feConfigs": {
    "lafEnv": "https://laf.dev" // laf环境。 https://laf.run （杭州阿里云） ,或者私有化的laf环境。如果使用 Laf openapi 功能，需要最新版的 laf 。
  },
  "systemEnv": {
    "vectorMaxProcess": 15,
    "qaMaxProcess": 15,
    "pgHNSWEfSearch": 100 // 向量搜索参数。越大，搜索越精确，但是速度越慢。设置为100，有99%+精度。
  },
  "llmModels": [
    {
      "model": "gpt-3.5-turbo", // 模型名(对应OneAPI中渠道的模型名)
      "name": "gpt-3.5-turbo", // 别名
      "avatar": "/imgs/model/openai.svg", // 模型的logo
      "maxContext": 16000, // 最大上下文
      "maxResponse": 4000, // 最大回复
      "quoteMaxToken": 13000, // 最大引用内容
      "maxTemperature": 1.2, // 最大温度
      "charsPointsPrice": 0,  // n积分/1k token（商业版）
      "censor": false, // 是否开启敏感校验（商业版）
      "vision": false, // 是否支持图片输入
      "datasetProcess": true, // 是否设置为知识库处理模型（QA），务必保证至少有一个为true，否则知识库会报错
      "usedInClassify": true, // 是否用于问题分类（务必保证至少有一个为true）
      "usedInExtractFields": true, // 是否用于内容提取（务必保证至少有一个为true）
      "usedInToolCall": true, // 是否用于工具调用（务必保证至少有一个为true）
      "usedInQueryExtension": true, // 是否用于问题优化（务必保证至少有一个为true）
      "toolChoice": true, // 是否支持工具选择（分类，内容提取，工具调用会用到。目前只有gpt支持）
      "functionCall": false, // 是否支持函数调用（分类，内容提取，工具调用会用到。会优先使用 toolChoice，如果为false，则使用 functionCall，如果仍为 false，则使用提示词模式）
      "customCQPrompt": "", // 自定义文本分类提示词（不支持工具和函数调用的模型
      "customExtractPrompt": "", // 自定义内容提取提示词
      "defaultSystemChatPrompt": "", // 对话默认携带的系统提示词
      "defaultConfig":{}  // 请求API时，挟带一些默认配置（比如 GLM4 的 top_p）
    },
    {
      "model": "gpt-4-0125-preview",
      "name": "gpt-4-turbo",
      "avatar": "/imgs/model/openai.svg",
      "maxContext": 125000,
      "maxResponse": 4000,
      "quoteMaxToken": 100000,
      "maxTemperature": 1.2,
      "charsPointsPrice": 0,
      "censor": false,
      "vision": false,
      "datasetProcess": false,
      "usedInClassify": true,
      "usedInExtractFields": true,
      "usedInToolCall": true,
      "usedInQueryExtension": true,
      "toolChoice": true,
      "functionCall": false,
      "customCQPrompt": "",
      "customExtractPrompt": "",
      "defaultSystemChatPrompt": "",
      "defaultConfig":{} 
    },
    {
      "model": "gpt-4-vision-preview",
      "name": "gpt-4-vision",
      "avatar": "/imgs/model/openai.svg",
      "maxContext": 128000,
      "maxResponse": 4000,
      "quoteMaxToken": 100000,
      "maxTemperature": 1.2,
      "charsPointsPrice": 0,
      "censor": false,
      "vision": true,
      "datasetProcess": false,
      "usedInClassify": false,
      "usedInExtractFields": false,
      "usedInToolCall": false,
      "usedInQueryExtension": false,
      "toolChoice": true,
      "functionCall": false,
      "customCQPrompt": "",
      "customExtractPrompt": "",
      "defaultSystemChatPrompt": "",
      "defaultConfig":{} 
    }
  ],
  "vectorModels": [
    {
      "model": "text-embedding-ada-002", // 模型名（与OneAPI对应）
      "name": "Embedding-2", // 模型展示名
      "avatar": "/imgs/model/openai.svg", // logo
      "charsPointsPrice": 0, // n积分/1k token
      "defaultToken": 700, // 默认文本分割时候的 token
      "maxToken": 3000, // 最大 token
      "weight": 100, // 优先训练权重
      "defaultConfig":{},  // 自定义额外参数。例如，如果希望使用 embedding3-large 的话，可以传入 dimensions:1024，来返回1024维度的向量。（目前必须小于1536维度）
      "dbConfig": {}, // 存储时的额外参数（非对称向量模型时候需要用到）
      "queryConfig": {} // 参训时的额外参数
    }
  ],
  "reRankModels": [],
  "audioSpeechModels": [
    {
      "model": "tts-1",
      "name": "OpenAI TTS1",
      "charsPointsPrice": 0,
      "voices": [
        { "label": "Alloy", "value": "alloy", "bufferId": "openai-Alloy" },
        { "label": "Echo", "value": "echo", "bufferId": "openai-Echo" },
        { "label": "Fable", "value": "fable", "bufferId": "openai-Fable" },
        { "label": "Onyx", "value": "onyx", "bufferId": "openai-Onyx" },
        { "label": "Nova", "value": "nova", "bufferId": "openai-Nova" },
        { "label": "Shimmer", "value": "shimmer", "bufferId": "openai-Shimmer" }
      ]
    }
  ],
  "whisperModel": {
    "model": "whisper-1",
    "name": "Whisper1",
    "charsPointsPrice": 0
  }
}
```

## 关于模型 logo

统一放置在项目的`public/imgs/model/xxx`目录中，目前内置了以下几种，如果有需要，可以PR增加。默认头像为 Hugging face 的 logo~

- /imgs/model/baichuan.svg - 百川
- /imgs/model/chatglm.svg - 智谱
- /imgs/model/calude.svg - calude
- /imgs/model/ernie.svg - 文心一言
- /imgs/model/moonshot.svg - 月之暗面
- /imgs/model/openai.svg - OpenAI GPT
- /imgs/model/qwen.svg - 通义千问
- /imgs/model/yi.svg - 零一万物
- /imgs/model/gemini.svg - gemini
- /imgs/model/deepseek.svg - deepseek
- /imgs/model/minimax.svg - minimax
- 

## 特殊模型

### ReRank 接入(私有部署)

请使用 4.6.6-alpha 以上版本，配置文件中的 `reRankModels` 为重排模型，虽然是数组，不过目前仅有第1个生效。

1. [部署 ReRank 模型](/docs/development/custom-models/bge-rerank/)
1. 找到 FastGPT 的配置文件中的 `reRankModels`， 4.6.6 以前是 `ReRankModels`。
2. 修改对应的值：

```json
{
    "reRankModels": [
        {
            "model": "bge-reranker-base", // 随意
            "name": "检索重排-base", // 随意
            "charsPointsPrice": 0,
            "requestUrl": "{{host}}/v1/rerank",
            "requestAuth": "安全凭证，已自动补 Bearer"
        }
    ]
}
```

### ReRank 接入（Cohere）

这个重排模型对中文不是很好，不如 bge 的好用。

1. 申请 Cohere 官方 Key: https://dashboard.cohere.com/api-keys
2. 修改 FastGPT 配置文件

```json
{
    "reRankModels": [
        {
            "model": "rerank-multilingual-v2.0", // 这里的model需要对应 cohere 的模型名
            "name": "检索重排", // 随意
            "requestUrl": "https://api.cohere.ai/v1/rerank",
            "requestAuth": "Coherer上申请的key"
        }
    ]
}
```
